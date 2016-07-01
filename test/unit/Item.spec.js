import Item from '../../src/Item';
import Store from './helpers/Test.Store';
import Transporter from './helpers/Test.Transporter';
import LocalStorage from './helpers/Test.LocalStorage';

import * as _ from 'lodash';
import { observable } from 'mobx';

describe('Item', function () {
  describe('constructor', function () {
    let TestItem;

    beforeEach(function () {
      TestItem = class SomeItem extends Item {
        get keys() {
          return ['content'];
        }
      };
      spyOn(TestItem.prototype, '_stateHandler');
    });

    it('should store the given store in _store', function () {
      const testItem = new TestItem('myStore');
      expect(testItem._store).toBe('myStore');
    });

    it('should store the given values if they are in keys', function () {
      const testItem = new TestItem('myStore', { content: 'my content', to: 'much' });
      expect(testItem.content).toBe('my content');
      expect(testItem.to).toBe(undefined);
    });

    it('should always store _id, id and _syncState', function () {
      const testItem = new TestItem('myStore', {
        _id: 'localId',
        id: 'transporterId',
        _syncState: 1,
      });
      expect(testItem._id).toBe('localId');
      expect(testItem.id).toBe('transporterId');
      expect(testItem._syncState).toBe(1);
    });

    it('should set _storeState to 1 if _id is given', function () {
      const testItem = new TestItem('myStore', {
        _id: 'localId',
      });
      expect(testItem._storeState).toBe(0);
    });

    it('should set _storeState to 0 if _id is given', function () {
      const testItem = new TestItem('myStore');
      expect(testItem._storeState).toBe(1);
    });

    it('should create a autorun stateHandler and store it as dispose', function () {
      const testItem = new TestItem('myStore');
      expect(typeof testItem.dispose).toBe('function');
      expect(testItem._stateHandler).toHaveBeenCalledTimes(1);
    });

    it('should convert _syncState of -2 to 3', function () {
      const testItem = new TestItem('myStore', { _syncState: -2 });
      expect(testItem._syncState).toBe(3);
    });
  });

  describe('public', function () {
    beforeEach(function () {
      class TestItem extends Item {
        @observable content;
        @observable title;
        get keys() {
          return this._keys ||
            [{ key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
            'content', 'title'];
        }
        set keys(k) {
          this._keys = k;
        }
        _stateHandler() {
          return this.rawItem;
        }
      }
      this.TestItem = TestItem;
      spyOn(TestItem.prototype, '_stateHandler').and.callThrough();
      spyOn(TestItem.prototype, '_synchronize')
        .and.returnValue(new Promise((resolve) => {
          resolve('_synchronize');
        }));
      this.store = new Store({ Item: TestItem, Transporter, LocalStorage });
      this.item = new TestItem(this.store, {
        content: 'my content',
        title: 'a title',
        _id: 'localId',
        id: 'serverId',
        _syncState: 0 });
    });

    describe('getLocalStorageKey', function () {
      beforeEach(function () {
        this.item.foreignKey = new this.TestItem({}, {});
        this.item.keys = ['content',
        { key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
        { key: 'foreignKey', primary: true, relationKey: 'foreignKeyId',
          _relationKey: '_foreignKeyId', storeKey: 'id', _storeKey: '_id', store: 'keys' },
          { key: 'anotherForeignKey', relationKey: 'anotherForeignKeyId',
            _relationKey: '_anotherForeignKeyId', storeKey: 'id', _storeKey: '_id', store: 'keys' },
        ];
        this.item.foreignKey.keys = [
          { key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
        ];
        spyOn(this.item, '_waitFor').and.returnValue(new Promise(resolve => {
          this.item._id = 'item id';
          setTimeout(resolve, 1);
        }));
        spyOn(this.item.foreignKey, '_waitFor').and.returnValue(new Promise(resolve => {
          this.item.foreignKey._id = 'foreign id';
          resolve();
        }));
      });
      it('should return _keys as soon as all _keys are available', function (done) {
        this.item.getLocalStorageKey()
          .then(key => {
            expect(key).toEqual({ _id: 'item id', _foreignKeyId: 'foreign id' });
            done();
          });
      });
    });

    describe('getTransporterKey', function () {
      beforeEach(function () {
        this.item.foreignKey = new this.TestItem({}, {});
        this.item.keys = ['content',
        { key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
        { key: 'foreignKey', primary: true, relationKey: 'foreignKeyId',
          _relationKey: '_foreignKeyId', storeKey: 'id', _storeKey: '_id', store: 'keys' },
          { key: 'anotherForeignKey', relationKey: 'anotherForeignKeyId',
            _relationKey: '_anotherForeignKeyId', storeKey: 'id', _storeKey: '_id', store: 'keys' },
        ];
        this.item.foreignKey.keys = [
          { key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
        ];
        spyOn(this.item, '_waitFor').and.returnValue(new Promise(resolve => {
          this.item.id = 'item id';
          resolve();
        }));
        spyOn(this.item.foreignKey, '_waitFor').and.returnValue(new Promise(resolve => {
          this.item.foreignKey.id = 'foreign id';
          resolve();
        }));
      });
      it('should return keys as soon as all keys are available', function (done) {
        this.item.getTransporterKey()
          .then(key => {
            expect(key).toEqual({ id: 'item id', foreignKeyId: 'foreign id' });
            done();
          });
      });
    });

    describe('enableAutoSaveAndSave', function () {
      afterEach(function () {
        expect(this.item._stateHandler).toHaveBeenCalledTimes(1);
      });
      it('should call synchronize with 2, 2', function (done) {
        this.item.enableAutoSaveAndSave().then(() => {
          expect(this.item._synchronize).toHaveBeenCalledTimes(1);
          expect(this.item._synchronize).toHaveBeenCalledWith(2, 2);
          done();
        });
      });

      it('should set autoSave to true', function (done) {
        this.item.autoSave = false;
        this.item.enableAutoSaveAndSave().then(() => {
          expect(this.item.autoSave).toBe(true);
          done();
        });
      });
    });

    describe('save', function () {
      beforeEach(function () {
        spyOn(this.item, 'set').and.returnValue(new Promise((resolve) => resolve('save')));
        spyOn(this.item, 'fromRawItem').and.returnValue({
          content: 'new content',
          title: 'my title',
          anything: 'else',
        });
      });

      it('should call the set method and deliver value as parameter', function (done) {
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then(() => {
          expect(this.item.set).toHaveBeenCalledTimes(1);
          expect(this.item.set).toHaveBeenCalledWith({
            content: 'my new content',
            title: 'my new title',
          });
          done();
        });
      });

      it('should return the promise of the set call', function (done) {
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then((returnValue) => {
          expect(returnValue).toBe('save');
          done();
        });
      });

      it('should keep the current autoSave value false', function () {
        this.item.autoSave = false;
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then(() => {
          expect(this.item.autoSave).toBe(false);
        });
      });

      it('should keep the current autoSave value true', function () {
        this.item.autoSave = true;
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then(() => {
          expect(this.item.autoSave).toBe(true);
        });
      });

      it('should save with no given values', function (done) {
        this.item.autoSave = true;
        this.item.save().then(() => {
          expect(this.item.set).toHaveBeenCalledTimes(1);
          done();
        });
      });
    });

    describe('saveLocal', function () {
      beforeEach(function () {
        spyOn(this.item, 'set').and.returnValue(new Promise((resolve) => resolve({
          content: 'my content',
          title: 'my title',
        })));
      });
      it('should call set and deliver a given value as parameter', function (done) {
        this.item.saveLocal({
          content: 'my content',
          title: 'my title',
        }).then(() => {
          expect(this.item.set).toHaveBeenCalledTimes(1);
          expect(this.item.set).toHaveBeenCalledWith({
            content: 'my content',
            title: 'my title',
          });
          done();
        });
      });
      it('should call _synchronize with the parameter (2,0)', function (done) {
        this.item.saveLocal({}).then(() => {
          expect(this.item._synchronize).toHaveBeenCalledTimes(1);
          expect(this.item._synchronize).toHaveBeenCalledWith(2, 0);
          done();
        });
      });
      it('should return the promise of the _synchronize call', function (done) {
        this.item.saveLocal({}).then((returnValue) => {
          expect(returnValue).toBe('_synchronize');
          done();
        });
      });
      it('should keep the current autoSave value true', function (done) {
        this.item.autoSave = true;
        this.item.saveLocal({}).then(() => {
          expect(this.item.autoSave).toBe(true);
          done();
        });
      });
      it('should keep the current autoSave value false', function (done) {
        this.item.autoSave = false;
        this.item.saveLocal({}).then(() => {
          expect(this.item.autoSave).toBe(false);
          done();
        });
      });
    });

    describe('remove', function () {
      beforeEach(function () {
        spyOn(this.item, '_onDeleteTrigger');
      });
      it('should return the promise of the _synchronize call', function (done) {
        this.item.remove().then((returnValue) => {
          expect(returnValue).toBe('_synchronize');
          done();
        });
      });
      it('should keep the current autoSave value true', function (done) {
        this.item.autoSave = true;
        this.item.remove().then(() => {
          expect(this.item.autoSave).toBe(true);
          done();
        });
      });
      it('should keep the current autoSave value false', function (done) {
        this.item.autoSave = false;
        this.item.remove().then(() => {
          expect(this.item.autoSave).toBe(false);
          done();
        });
      });
      // it('should call _onDeleteTrigger', function (done) {
      //   this.item.remove().them(() => {
      //     expect(this.item._onDeleteTrigger).toHaveBeenCalledTimes(1);
      //     done();
      //   });
      // });
      // it('should call _synchronize with the parameter (2,3)', function (done) {
      //   this.item.remove().them(() => {
      //     expect(this.item._synchronize).toHaveBeenCalledWith(2, 3);
      //     done();
      //   });
      // });
    });

    describe('fetch', function () {
      beforeEach(function () {
        spyOn(this.item, 'fromTransporter');
        spyOn(this.item._store.transporter, 'fetch')
          .and.returnValue(new Promise((resolve) => resolve({
            content: 'my new content',
            title: 'my new title',
          })));
      });
      it('should return the promise of the _synchronize call', function (done) {
        this.item.fetch().then((returnValue) => {
          expect(returnValue).toBe('_synchronize');
          done();
        });
      });
      it('should keep the current autoSave value true', function (done) {
        this.item.autoSave = true;
        this.item.fetch().then(() => {
          expect(this.item.autoSave).toBe(true);
          done();
        });
      });
      it('should keep the current autoSave value false', function (done) {
        this.item.autoSave = false;
        this.item.fetch().then(() => {
          expect(this.item.autoSave).toBe(false);
          done();
        });
      });
      it('should call fetch method to store', function (done) {
        this.item.fetch().then(() => {
          expect(this.item._store.transporter.fetch).toHaveBeenCalledWith(this.item.toTransporter);
          done();
        });
      });
      it('should call fromTransporter with the fetchedData as parameter', function (done) {
        this.item.fetch().then(() => {
          expect(this.item.fromTransporter).toHaveBeenCalledWith({
            content: 'my new content',
            title: 'my new title',
          });
          done();
        });
      });
      it('should call _synchronize with the parameter (2,0)', function (done) {
        this.item.fetch().then(() => {
          expect(this.item._synchronize).toHaveBeenCalledWith(2, 0);
          done();
        });
      });
    });

    describe('set', function () {
      it('should not sync if autoSave is false', function (done) {
        this.item.autoSave = false;
        this.item.set({
          content: 'new content',
          title: 'my title',
        }).then(() => {
          expect(this.item._stateHandler).toHaveBeenCalledTimes(3);
          expect(this.item._synchronize).not.toHaveBeenCalled();
          done();
        });
      });
      it('should sync if autoSave is true', function (done) {
        this.item.autoSave = true;
        this.item.set({
          content: 'new content',
          title: 'my title',
        }).then(() => {
          expect(this.item._stateHandler).toHaveBeenCalledTimes(3);
          expect(this.item._synchronize).toHaveBeenCalledTimes(1);
          done();
        });
      });
      it('should store all given values in keys before synchronizing', function (done) {
        this.item.autoSave = true;
        this.item.set({
          content: 'new content',
          title: 'my title',
          anything: 'else',
        }).then(() => {
          expect(this.item.content).toBe('new content');
          expect(this.item.title).toBe('my title');
          expect(this.item.anything).toBe(undefined);
          done();
        });
      });
    });

    describe('to/from***', function () {
      beforeEach(function () {
        class TestItem extends Item {
          @observable content;
          @observable title;
          // @observable author;
          // @observable anotherAuthor;
          get keys() {
            return this._keys || ['content', 'title'];
          }
          set keys(k) {
            this._keys = k;
          }
          // _stateHandler() {
          //   return {
          //     title: this.title,
          //     content: this.content,
          //   };
          // }
        }
        class Author extends Item {

          get keys() {
            return [{ primary: true, _relationKey: '_id', relationKey: 'id' }];
          }
          _stateHandler() {
          }
        }
        this.Author = Author;
        spyOn(TestItem.prototype, '_stateHandler').and.callThrough();
        spyOn(TestItem.prototype, '_synchronize')
          .and.returnValue(Promise.resolve('_synchronize'));
        this.store = new Store({ Item: TestItem, Transporter, LocalStorage });
        this.store.stores.authors = this.store;
        this.item = new TestItem(this.store, {
          content: 'my content',
          title: 'a title',
          _id: 'localId',
          id: 'serverId',
          _syncState: 0 });
        this.item._synchronize.calls.reset(); // we reset after constructor
        this.author = new Author(this.store, {
          _id: '_authorId',
          id: 'authorId',
          _syncState: 0 });
        this.anotherAuthor = new Author(this.store, {
          _id: '_anotherAuthorId',
          id: 'anotherAuthorId',
          _syncState: 0 });
        this.item.author = this.author;
        this.item.anotherAuthor = this.anotherAuthor;
        this.item.keys = ['content', 'title',
          { primary: true, key: 'id', relationKey: 'id', _relationKey: '_id' },
          { key: 'author', store: 'authors', storeKey: 'id', _storeKey: '_id',
            relationKey: 'authorId', _relationKey: '_authorId' },
          { key: 'anotherAuthor', store: 'authors', storeKey: 'id', _storeKey: '_id',
            relationKey: 'anotherAuthorId', _relationKey: '_anotherAuthorId' }];
      });

      describe('fromRawItem', function () {

      });

      describe('fromLocalStorage', function () {
        beforeEach(function () {
          spyOn(this.item, '_fromOutside').and.returnValue(Promise.resolve('_fromOutside'));
        });
        it('should call _fromOutside with prefix "_"', function (done) {
          this.item.fromLocalStorage({ _syncState: 'syncState' })
            .then(() => {
              expect(this.item._fromOutside).toHaveBeenCalledWith({ _syncState: 'syncState' }, '_');
              done();
            });
        });
        it('should call synchronize to push to transporter', function (done) {
          this.item.fromLocalStorage({ _syncState: 'syncState' })
            .then(() => {
              expect(this.item._synchronize).toHaveBeenCalledWith(undefined, 'syncState');
              done();
            });
        });
      });

      describe('fromTransporter', function () {
        beforeEach(function () {
          spyOn(this.item, '_fromOutside').and.returnValue(Promise.resolve('_fromOutside'));
        });
        it('should call _fromOutside with prefix ""', function (done) {
          this.item.fromTransporter('values')
            .then(() => {
              expect(this.item._fromOutside).toHaveBeenCalledWith('values', '');
              done();
            });
        });
        it('should call synchronize to store locally only', function (done) {
          this.item.fromTransporter('values')
            .then(() => {
              expect(this.item._synchronize).toHaveBeenCalledWith(2);
              done();
            });
        });
      });

      describe('_fromOutside', function () {
        beforeEach(function () {
          spyOn(this.item, '_setPrimaryKey');
          spyOn(this.store, 'resolveAsync')
            .and.returnValues(
              Promise.resolve(this.author),
              Promise.resolve(this.anotherAuthor));
          this.content = {
            content: 'newer content',
            title: 'newer title',
            id: 'invalid id',
            authorId: 'foreignId',
            anotherAuthorId: 'anotherForeignId',
          };
          delete this.item.author;
          delete this.item.anotherAuthor;
        });
        it('should set simple values to given ones', function (done) {
          this.item._fromOutside(this.content, '')
            .then(() => {
              expect(this.item.content).toEqual('newer content');
              expect(this.item.content).toEqual('newer content');
              done();
            });
        });
        it('should set primary key', function (done) {
          this.item._fromOutside(this.content, '')
            .then(() => {
              expect(this.item._setPrimaryKey).toHaveBeenCalledWith(this.content);
              done();
            });
        });
        it('should resolve foreign transporter keys and store the recieved item', function (done) {
          this.item._fromOutside(this.content, '')
            .then(() => {
              expect(this.store.resolveAsync.calls.argsFor(0)[0]).toEqual({
                id: 'foreignId',
              });
              expect(this.store.resolveAsync.calls.argsFor(1)[0]).toEqual({
                id: 'anotherForeignId',
              });
              done();
            });
        });
        it('should resolve foreign localStorage keys and store the recieved item', function (done) {
          this.content._authorId = '_foreignId';
          this.content._anotherAuthorId = '_anotherForeignId';
          delete this.content.authorId;
          delete this.content.anotherAuthorId;
          this.item._fromOutside(this.content, '_')
            .then(() => {
              expect(this.store.resolveAsync.calls.argsFor(0)[0]).toEqual({
                _id: '_foreignId',
              });
              expect(this.store.resolveAsync.calls.argsFor(1)[0]).toEqual({
                _id: '_anotherForeignId',
              });
              done();
            });
        });
        describe('should deactivate autoSave while changing values', function () {
          it('autosave is true', function (done) {
            this.item.autoSave = true;
            this.item._fromOutside(this.content, '')
              .then(() => {
                expect(this.item.autoSave).toBe(true);
                expect(this.item._synchronize).not.toHaveBeenCalled();
                done();
              });
          });
          it('autosave is false', function (done) {
            this.item.autoSave = false;
            this.item._fromOutside(this.content, '')
              .then(() => {
                expect(this.item.autoSave).toBe(false);
                expect(this.item._synchronize).not.toHaveBeenCalled();
                done();
              });
          });
        });
      });

      describe('toRawItem', function () {
        it('should get raw data incl relations',
          function (done) {
            this.item.toRawItem().then(result => {
              expect(result).toEqual({
                _id: 'localId',
                id: 'serverId',
                content: 'my content',
                title: 'a title',
                author: {
                  _id: '_authorId',
                  id: 'authorId',
                },
                anotherAuthor: {
                  _id: '_anotherAuthorId',
                  id: 'anotherAuthorId',
                },
              });
              done();
            });
          });
        it('should get only direct data', function (done) {
          this.item.toRawItem(true).then(result => {
            expect(result).toEqual({
              content: 'my content',
              title: 'a title',
            });
            done();
          });
        });
      });

      describe('toTransporter', function () {
        it('should get all entries of keys stored in keys',
         function (done) {
           spyOn(this.item.author, 'getTransporterKey')
            .and.returnValue(Promise.resolve());
           spyOn(this.item.anotherAuthor, 'getTransporterKey')
            .and.returnValue(Promise.resolve());
           this.item.toTransporter().then(result => {
             expect(result).toEqual({
               content: 'my content',
               title: 'a title',
               id: 'serverId',
               authorId: 'authorId',
               anotherAuthorId: 'anotherAuthorId',
             });
             done();
           });
         });
        it('should call itself again if items change while waiting',
          function (done) {
            this.aThirdAuthor = new this.Author(this.store, {
              id: 'thirdAuthorId',
              _syncState: 0 });
            spyOn(this.aThirdAuthor, 'getTransporterKey')
             .and.returnValue(Promise.resolve());
            spyOn(this.item.author, 'getTransporterKey')
             .and.returnValue(Promise.resolve());
            spyOn(this.item.anotherAuthor, 'getTransporterKey')
             .and.returnValue(Promise.resolve());
            this.item.toTransporter().then(result => {
              expect(result).toEqual({
                content: 'my content',
                title: 'a title',
                id: 'serverId',
                authorId: 'authorId',
                anotherAuthorId: 'thirdAuthorId',
              });
              expect(this.anotherAuthor.getTransporterKey).toHaveBeenCalled();
              expect(this.aThirdAuthor.getTransporterKey).toHaveBeenCalled();
              done();
            });
            this.item.anotherAuthor = this.aThirdAuthor;
          });
      });

      describe('toLocalStorage', function () {
        it('should get _syncState and all entries of keys stored in keys',
         function (done) {
           spyOn(this.item.author, 'getLocalStorageKey')
            .and.returnValue(Promise.resolve());
           spyOn(this.item.anotherAuthor, 'getLocalStorageKey')
            .and.returnValue(Promise.resolve());
           this.item.toLocalStorage().then(result => {
             expect(result).toEqual({
               content: 'my content',
               title: 'a title',
               id: 'serverId',
               _id: 'localId',
               _syncState: 0,
               authorId: 'authorId',
               _authorId: '_authorId',
               anotherAuthorId: 'anotherAuthorId',
               _anotherAuthorId: '_anotherAuthorId',
             });
             done();
           });
         });
        it('should call itself again if items change while waiting',
          function (done) {
            this.aThirdAuthor = new this.Author(this.store, {
              _id: '_thirdAuthorId',
              _syncState: 0 });
            spyOn(this.aThirdAuthor, 'getLocalStorageKey')
             .and.returnValue(Promise.resolve());
            spyOn(this.item.author, 'getLocalStorageKey')
             .and.returnValue(Promise.resolve());
            spyOn(this.item.anotherAuthor, 'getLocalStorageKey')
             .and.returnValue(Promise.resolve());
            this.item.toLocalStorage().then(result => {
              expect(result).toEqual({
                content: 'my content',
                title: 'a title',
                id: 'serverId',
                _id: 'localId',
                _syncState: 0,
                authorId: 'authorId',
                _authorId: '_authorId',
                anotherAuthorId: undefined,
                _anotherAuthorId: '_thirdAuthorId',
              });
              expect(this.anotherAuthor.getLocalStorageKey).toHaveBeenCalled();
              expect(this.aThirdAuthor.getLocalStorageKey).toHaveBeenCalled();
              done();
            });
            this.item.anotherAuthor = this.aThirdAuthor;
          });
      });
    });
  });

  describe('privates', function () {
    beforeEach(function () {
      const propertySpy = jasmine.createSpy('propertySpy');
      this.propertySpy = propertySpy;
      class TestItem extends Item {
        @observable content;
        @observable title;
        get keys() {
          return this._keys ||
            [{ key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
            'content', 'title'];
        }
        set keys(k) {
          this._keys = k;
        }
        get rawItem() {
          propertySpy('rawItem');
          return super.rawItem;
        }
      }
      spyOn(TestItem.prototype, '_setSyncState').and.callThrough();
      spyOn(TestItem.prototype, '_setStoreState').and.callThrough();
      spyOn(TestItem.prototype, '_stateHandler');
      this.TestItem = TestItem;
      this.store = new Store({ Item: TestItem, Transporter, LocalStorage });
      this.item = new TestItem(this.store, {
        content: 'my content',
        title: 'a title',
        _id: 'localId',
        id: 'serverId',
        _syncState: 1 });
      // we dont want constructor related getters/setters to interfere
      propertySpy.calls.reset();
    });

    describe('transactions', function () {
      beforeEach(function () {
        spyOn(this.item, '_transaction')
          .and.callThrough();
      });

      describe('_localStorageCreate', function () {
        beforeEach(function () {
          this.item._id = undefined;
          this.item._storeState = 1;
          spyOn(this.store.localStorage, 'create')
            .and.returnValue(Promise.resolve({ localStorage: 'response' }));
          spyOn(this.item, 'toLocalStorage')
            .and.returnValue(Promise.resolve({ some: 'data' }));
          spyOn(this.item, '_setPrimaryKey');
        });
        it('should wrap async task in _transaction', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.item._transaction).toHaveBeenCalled();
            done();
          });
        });
        it('should save the returned _id in item', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.item._setPrimaryKey).toHaveBeenCalledWith({ localStorage: 'response' });
            done();
          });
        });
        it('should create item in local storage', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.store.localStorage.create).toHaveBeenCalled();
            expect(this.store.localStorage.create).toHaveBeenCalledWith({
              some: 'data',
            });
            done();
          });
        });
        it('should set _storeState to 0 after creation', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.item._storeState).toBe(0);
            done();
          });
        });
        it('should resolve even after failed transaction', function (done) {
          this.item._localStorageCreate().then(() => {
            // it still failed, so we dont reset the store state
            expect(this.item._storeState).toBe(1);
            // as this should be part of the transaction, it must still have happenend
            expect(this.item._setPrimaryKey).toHaveBeenCalledWith({ localStorage: 'response' });
            done();
          });
          this.item._transactionId = 'another transaction';
        });
        it('should still reject on localStorage error', function (done) {
          this.store.localStorage.create
            .and.returnValue(Promise.reject(new Error('local storage error')));
          this.item._localStorageCreate().catch((err) => {
            // it still failed, so we dont reset the store state
            expect(err).toEqual(new Error('local storage error'));
            // as this should be part of the transaction, it must still have happenend
            expect(this.item._id).toBe(undefined);
            done();
          });
        });
      });

      describe('_localStorageSave', function () {
        beforeEach(function () {
          this.item._storeState = 2;
          spyOn(this.store.localStorage, 'save')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, 'toLocalStorage')
            .and.returnValue(Promise.resolve({ some: 'data' }));
          spyOn(this.item, 'getLocalStorageKey')
            .and.callFake(() => {
              expect(this.item.toLocalStorage.calls.count()).toBe(0);
              return Promise.resolve();
            });
        });
        it('should wrap async task in _transaction', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.item._transaction).toHaveBeenCalled();
            done();
          });
        });
        it('should wait for item keys to be created in storage before saving it', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.item.getLocalStorageKey).toHaveBeenCalled();
            done();
          });
        });
        it('should save item in localStorage', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.store.localStorage.save).toHaveBeenCalled();
            expect(this.store.localStorage.save).toHaveBeenCalledWith({
              some: 'data',
            });
            done();
          });
        });
        it('should set _storeState to 0 after saving', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.item._storeState).toBe(0);
            done();
          });
        });
        it('should not set _storeState to 0 if transaction fails', function (done) {
          this.item._localStorageSave().catch(() => {
            expect(this.item._storeState).toBe(2);
            done();
          });
          this.item._transactionId = 'another transaction';
        });
      });
      describe('_localStorageRemove', function () {
        beforeEach(function () {
          this.item._storeState = 3;
          spyOn(this.store.localStorage, 'remove')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, 'getLocalStorageKey')
            .and.callFake(() => {
              expect(this.store.localStorage.remove.calls.count()).toBe(0);
              return Promise.resolve('local id');
            });
        });
        it('should wrap async task in _transaction', function (done) {
          this.item._localStorageRemove().then(() => {
            expect(this.item._transaction).toHaveBeenCalled();
            done();
          });
        });
        it('should wait for item to be created in storage before deleting it again',
        function (done) {
          this.item._localStorageRemove().then(() => {
            expect(this.item.getLocalStorageKey).toHaveBeenCalled();
            done();
          });
        });
        it('should remove item in localStorage', function (done) {
          this.item._localStorageRemove().then(() => {
            expect(this.store.localStorage.remove).toHaveBeenCalled();
            expect(this.store.localStorage.remove).toHaveBeenCalledWith('local id');
            done();
          });
        });
        it('should keep set store state after removing', function (done) {
          this.item._localStorageRemove().then(() => {
            expect(this.item._storeState).toBe(-1);
            done();
          });
        });
      });
      describe('_localStorageDelete', function () {
        beforeEach(function () {
          this.item._storeState = 3;
          spyOn(this.store.localStorage, 'delete')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, 'getLocalStorageKey')
            .and.callFake(() => {
              expect(this.store.localStorage.delete.calls.count()).toBe(0);
              return Promise.resolve('local id');
            });
        });
        it('should make a new _transaction', function (done) {
          this.item._localStorageDelete().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(1);
            done();
          });
        });
        // NOTE: not sure about the following yet
        // it('should resolve even if the transaction fails', function (done) {
        //   this.item._localStorageDelete().then(() => {
        //     expect(this.item._transaction).toHaveBeenCalledTimes(1);
        //     done();
        //   });
        //   this.item._transactionId = 'newer transaction';
        // });
        it('should set _storeState to -1 after deleting', function (done) {
          this.store.localStorage.delete.and.callFake(() => {
            expect(this.item._storeState).not.toBe(-1);
          });
          this.item._localStorageDelete().then(() => {
            expect(this.item._storeState).toBe(-1);
            done();
          });
        });
        it('should delete item in localStorage', function (done) {
          this.item._localStorageDelete().then(() => {
            expect(this.item.getLocalStorageKey).toHaveBeenCalled();
            expect(this.store.localStorage.delete).toHaveBeenCalled();
            expect(this.store.localStorage.delete).toHaveBeenCalledWith('local id');
            done();
          });
        });
      });
      describe('_stateHandlerTrigger', function () {
        it('should call getter for each property that can change', function () {
          const ends = {
            id: false,
            foreign: false,
            something: false,
          };
          class Test extends this.TestItem {
            keys = [
              { key: 'id', primary: true, relationKey: 'id', _relationKey: '_id' },
              { key: 'foreign', store: 'foreign' },
              'something'];

            get id() {
              ends.id = true;
            }
            get foreign() {
              ends.foreign = true;
            }
            get something() {
              ends.something = true;
            }
          }
          const item = new Test({});
          item._stateHandlerTrigger();
          expect(ends).toEqual({ id: false, foreign: true, something: true });
        });
      });
      describe('_transporterCreate', function () {
        beforeEach(function () {
          this.item.id = undefined;
          this.item._syncState = 1;
          spyOn(this.store.transporter, 'create')
            .and.returnValue(Promise.resolve({ id: 'serverId' }));
          spyOn(this.item, '_localStorageSave')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, '_setPrimaryKey');
          spyOn(this.item, 'toTransporter')
            .and.returnValue(Promise.resolve({ some: 'data' }));
        });
        it('should wrap async tasks in _transaction', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should create item and save serverId in item', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._setPrimaryKey).toHaveBeenCalledWith({ id: 'serverId' });
            expect(this.store.transporter.create).toHaveBeenCalled();
            expect(this.store.transporter.create).toHaveBeenCalledWith({ some: 'data' });
            done();
          });
        });
        it('should create item and save serverId in item even if transaction fails',
        function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._setPrimaryKey).toHaveBeenCalledWith({ id: 'serverId' });
            expect(this.store.transporter.create).toHaveBeenCalled();
            expect(this.store.transporter.create).toHaveBeenCalledWith({ some: 'data' });
            done();
          });
          this.item._transactionId = 'newer transaction';
        });
        it('should set _syncState to 0 and store it local if transaction passes', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._syncState).toBe(0);
            expect(this.item._localStorageSave).toHaveBeenCalled();
            done();
          });
        });
        it('should not set _syncState to 0 if transaction fails', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._syncState).toBe(1);
            expect(this.item._localStorageSave).not.toHaveBeenCalled();
            done();
          });
          this.item._transactionId = 'newer transaction';
        });
      });
      describe('_transporterDelete', function () {
        beforeEach(function () {
          this.item._syncState = 3;
          spyOn(this.store.transporter, 'delete')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, '_localStorageDelete')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, 'getTransporterKey')
            .and.callFake(() => {
              expect(this.store.transporter.delete.calls.count()).toBe(0);
              return Promise.resolve({
                id: 'serverId',
              });
            });
        });
        it('should make a new _transaction', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(1);
            done();
          });
        });
        // NOTE: not sure about the following yet
        // it('should resolve even if the transaction fails', function (done) {
        //   this.item._transporterDelete().then(() => {
        //     expect(this.item._transaction).toHaveBeenCalledTimes(1);
        //     done();
        //   });
        //   this.item._transactionId = 'newer transaction';
        // });
        it('should set _syncState to -1 after deleting', function (done) {
          this.store.transporter.delete.and.callFake(() => {
            expect(this.item._syncState).not.toBe(-1);
          });
          this.item._transporterDelete().then(() => {
            expect(this.item._syncState).toBe(-1);
            done();
          });
        });
        it('should delete item in transporter', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.item.getTransporterKey).toHaveBeenCalled();
            expect(this.store.transporter.delete).toHaveBeenCalled();
            expect(this.store.transporter.delete).toHaveBeenCalledWith({
              id: 'serverId',
            });
            done();
          });
        });
        it('should delete the item in localStorage', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.item._localStorageDelete).toHaveBeenCalled();
            done();
          });
        });
      });
      describe('_transporterSave', function () {
        beforeEach(function () {
          this.item._syncState = 2;
          spyOn(this.item, 'toTransporter')
            .and.returnValue(Promise.resolve({ some: 'data' }));
          spyOn(this.store.transporter, 'save')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, '_localStorageSave')
            .and.returnValue(Promise.resolve());
          spyOn(this.item, 'getTransporterKey')
            .and.callFake(() => {
              expect(this.item.toTransporter.calls.count()).toBe(0);
              return Promise.resolve();
            });
        });
        it('should wrap async tasks in _transaction', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(1);
            done();
          });
        });
        it('should set _syncState to 0 and store locally after saving', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.item._syncState).toBe(0);
            expect(this.item._localStorageSave).toHaveBeenCalled();
            done();
          });
        });
        it('should not set _syncState and store locally if transaction fails', function (done) {
          this.item._transporterSave().catch(() => {
            expect(this.item._syncState).toBe(2);
            expect(this.item._localStorageSave).not.toHaveBeenCalled();
            done();
          });
          this.item._transactionId = 'newer transaction';
        });
        it('should save item in transporter', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.item.getTransporterKey).toHaveBeenCalled();
            expect(this.item.toTransporter).toHaveBeenCalled();
            expect(this.store.transporter.save).toHaveBeenCalled();
            expect(this.store.transporter.save).toHaveBeenCalledWith({ some: 'data' });
            done();
          });
        });
        it('should save item in transporter even if transaction fails', function (done) {
          this.item._transporterSave().catch(() => {
            expect(this.store.transporter.save).toHaveBeenCalled();
            done();
          });
          this.item._transactionId = 'newer transaction';
        });
      });
    });

    describe('_getValidNewState', function () {
      beforeEach(function () {
        const states = [-2, -1, 0, 1, 2, 3];
        this.test = (current, positives) => {
          states.forEach(state => {
            let expected = _.find(positives, positive => positive === state);
            if (expected === undefined) {
              expected = current;
            }
            expect(this.item._getValidNewState(current, state)).toEqual(expected);
          });
        };
        this.test3 = () => {
          states.forEach(state => {
            let expected = -2;
            if (state === -1) {
              expected = -1;
            }
            expect(this.item._getValidNewState(3, state)).toEqual(expected);
          });
        };
      });
      it('should handle -2 state', function () {
        this.test(-2, [-1]);
      });
      it('should handle -1 state', function () {
        this.test(-1, []);
      });
      it('should handle 0 state', function () {
        this.test(0, [2, 3]);
      });
      it('should handle 1 state', function () {
        this.test(1, [0, 2, 3]);
      });
      it('should handle 2 state', function () {
        this.test(2, [0, 3]);
      });
      it('should handle 3 state', function () {
        this.test3();
      });
      it('should handle random state', function () {
        this.test(100, []);
      });
    });

    describe('_setPrimaryKey', function () {
      beforeEach(function () {
        delete this.item.key1;
        delete this.item._key1;
        delete this.item.key2;
        delete this.item._key2;
        delete this.item.key3;
        delete this.item._key3;
        this.item.keys = [
          'someKey',
          { primary: true, key: 'key1', relationKey: 'key1Id', _relationKey: '_key1Id' },
          { primary: true, key: 'key2', relationKey: 'key2Id', _relationKey: '_key2Id',
            storeKey: 'id', store: 'key2s' },
          { key: 'key3', relationKey: 'key3Id', _relationKey: '_key3Id',
            storeKey: 'id', store: 'key3s' }];
      });
      it('should set a local primary key if the key is undefined', function () {
        this.item._setPrimaryKey({ _key1Id: 'k1' });
        expect(this.item._key1Id).toBe('k1');
      });
      it('should set a transporter primary key if the key is undefined', function () {
        this.item._setPrimaryKey({ key1Id: 'k1' });
        expect(this.item.key1Id).toBe('k1');
      });
      it('should not set a local primary key if the key is defined', function () {
        this.item._key1Id = 'old';
        this.item._setPrimaryKey({ _key1Id: 'k1' });
        expect(this.item._key1Id).toBe('old');
      });
      it('should not set a transporter primary key if the key is defined', function () {
        this.item.key1Id = 'old';
        this.item._setPrimaryKey({ key1Id: 'k1' });
        expect(this.item.key1Id).toBe('old');
      });
      it('should not set foreign primary keys', function () {
        this.item._setPrimaryKey({ key2Id: 'k2' });
        expect(this.item.key2Id).toBe(undefined);
        this.item._setPrimaryKey({ _key2Id: 'k2' });
        expect(this.item._key2Id).toBe(undefined);
      });
      it('should not set entries which arent defined as item.primary', function () {
        this.item._setPrimaryKey({ key3Id: 'k3' });
        expect(this.item.key3Id).toBe(undefined);
        this.item._setPrimaryKey({ _key3Id: 'k3' });
        expect(this.item._key3Id).toBe(undefined);
      });
    });
    describe('_setStoreState', function () {
      it('should get valid new state and store it in _storeState', function () {
        spyOn(this.item, '_getValidNewState').and.returnValue(2);
        this.item._storeState = 0;
        this.item._setStoreState(1);
        expect(this.item._getValidNewState).toHaveBeenCalledWith(0, 1);
        expect(this.item._storeState).toEqual(2);
      });
      it('should set stored to true if state is 0 or -1', function () {
        spyOn(this.item, '_getValidNewState').and.returnValues(0, -1);
        function test(item) {
          item._storeState = 0;
          item.stored = false;
          item._setStoreState(1);
          expect(item.stored).toEqual(true);
        }
        test(this.item);
        test(this.item);
      });
      it('should set stored to false if state is 1, 2, 3, -2', function () {
        spyOn(this.item, '_getValidNewState').and.returnValues(1, 2, 3, -2);
        function test(item) {
          item._storeState = 0;
          item.stored = true;
          item._setStoreState(1);
          expect(item.stored).toEqual(false);
        }
        test(this.item);
        test(this.item);
        test(this.item);
        test(this.item);
      });
    });
    describe('_setSyncState', function () {
      it('should get valid new state and store it in _syncState', function () {
        spyOn(this.item, '_getValidNewState').and.returnValue(2);
        this.item._syncState = 0;
        this.item._setSyncState(1);
        expect(this.item._getValidNewState).toHaveBeenCalledWith(0, 1);
        expect(this.item._syncState).toEqual(2);
      });
      it('should set synced to true if state is 0 or -1', function () {
        spyOn(this.item, '_getValidNewState').and.returnValues(0, -1);
        function test(item) {
          item._syncState = 0;
          item.synced = false;
          item._setSyncState(1);
          expect(item.synced).toEqual(true);
        }
        test(this.item);
        test(this.item);
      });
      it('should set synced to false if state is 1, 2, 3, -2', function () {
        spyOn(this.item, '_getValidNewState').and.returnValues(1, 2, 3, -2);
        function test(item) {
          item._syncState = 0;
          item.synced = true;
          item._setSyncState(1);
          expect(item.synced).toEqual(false);
        }
        test(this.item);
        test(this.item);
        test(this.item);
        test(this.item);
      });
    });
    describe('_stateHandler', function () {
      beforeEach(function () {
        this.item._stateHandler.and.callThrough();
        spyOn(this.item, '_synchronize');
        spyOn(this.item, '_stateHandlerTrigger');
      });
      it('should get _stateHandlerTrigger in synchron part', function () {
        this.item._stateHandler(0);
        this.item._stateHandler(1);
        expect(this.item._stateHandlerTrigger).toHaveBeenCalledTimes(2);
      });
      it('should synchronize(x, y) if its the first call', function () {
        this.item._stateHandler(0);
        expect(this.item._synchronize).toHaveBeenCalledTimes(1);
        expect(this.item._synchronize).toHaveBeenCalledWith();
      });
      it('should synchronize(2, 2) if autoSave is on and its not the first call', function () {
        this.item._storeState = 0;
        this.item._syncState = 1;
        this.item._stateHandler(1);
        expect(this.item._synchronize).toHaveBeenCalledTimes(1);
        expect(this.item._synchronize).toHaveBeenCalledWith(2, 2);
      });
      it('should not synchronize if autoSave is off and its not the first call', function () {
        this.item.autoSave = false;
        this.item._stateHandler(1);
        expect(this.item._synchronize).not.toHaveBeenCalled();
      });
    });
    describe('_synchronize', function () {
      beforeEach(function () {
        spyOn(this.item, '_synchronizeLocalStorage')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_synchronizeTransporter')
          .and.returnValue(Promise.resolve());
        this.item._setStoreState.calls.reset();
        this.item._setSyncState.calls.reset();
      });
      it('should not change store state if it isn\'t given', function (done) {
        this.item._synchronize(undefined, 2).then(() => {
          expect(this.item._setStoreState).not.toHaveBeenCalled();
          expect(this.item._setSyncState).toHaveBeenCalledWith(2);
          done();
        });
      });
      it('should not change sync state if it isn\'t given', function (done) {
        this.item._synchronize(1, undefined).then(() => {
          expect(this.item._setStoreState).toHaveBeenCalledWith(1);
          expect(this.item._setSyncState).not.toHaveBeenCalled();
          done();
        });
      });
      it('should set states to given ones', function (done) {
        this.item._synchronize(0, 0).then(() => {
          expect(this.item._setStoreState).toHaveBeenCalledWith(0);
          expect(this.item._setSyncState).toHaveBeenCalledWith(0);
          done();
        });
      });
      it('should call the _synchronizeLocalStorage and _synchronizeTransporter', function (done) {
        this.item._synchronize(1, 2).then(() => {
          expect(this.item._synchronizeLocalStorage)
            .toHaveBeenCalledTimes(1);
          expect(this.item._synchronizeTransporter)
              .toHaveBeenCalledTimes(1);
          done();
        });
      });
      it('should save the returned promise in this.lastSynchronize', function (done) {
        delete this.item.lastSynchronize;
        this.item._synchronize(1, 2);
        this.item.lastSynchronize.then(() => {
          done();
        });
      });
    });
    describe('_synchronizeLocalStorage', function () {
      beforeEach(function () {
        spyOn(this.item, '_localStorageCreate')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_localStorageSave')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_localStorageDelete')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_localStorageRemove')
          .and.returnValue(Promise.resolve());
      });
      it('should call _localStorageCreate if storestatus is 1', function (done) {
        this.item._storeState = 1;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).toHaveBeenCalled();
          expect(this.item._localStorageSave).not.toHaveBeenCalled();
          expect(this.item._localStorageRemove).not.toHaveBeenCalled();
          expect(this.item._localStorageDelete).not.toHaveBeenCalled();
          done();
        });
      });
      it('should call _localStorageSave if storestatus is 2', function (done) {
        this.item._storeState = 2;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).not.toHaveBeenCalled();
          expect(this.item._localStorageSave).toHaveBeenCalled();
          expect(this.item._localStorageRemove).not.toHaveBeenCalled();
          expect(this.item._localStorageDelete).not.toHaveBeenCalled();
          done();
        });
      });
      it('should call _localStorageRemove if storestatus is 3', function (done) {
        this.item._storeState = 3;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).not.toHaveBeenCalled();
          expect(this.item._localStorageSave).not.toHaveBeenCalled();
          expect(this.item._localStorageRemove).toHaveBeenCalled();
          expect(this.item._localStorageDelete).not.toHaveBeenCalled();
          done();
        });
      });
      it('should do nothing if storestatus is 0', function (done) {
        this.item._storeState = 0;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).not.toHaveBeenCalled();
          expect(this.item._localStorageSave).not.toHaveBeenCalled();
          expect(this.item._localStorageRemove).not.toHaveBeenCalled();
          expect(this.item._localStorageDelete).not.toHaveBeenCalled();
          done();
        });
      });
    });
    describe('_synchronizeTransporter', function () {
      beforeEach(function () {
        spyOn(this.item, '_transporterCreate')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_transporterSave')
          .and.returnValue(Promise.resolve());
        spyOn(this.item, '_transporterDelete')
          .and.returnValue(Promise.resolve());
      });
      it('should call _transporterCreate if syncstatus is 1', function (done) {
        this.item._syncState = 1;
        this.item._synchronizeTransporter().then(() => {
          expect(this.item._transporterCreate).toHaveBeenCalled();
          expect(this.item._transporterSave).not.toHaveBeenCalled();
          expect(this.item._transporterDelete).not.toHaveBeenCalled();
          done();
        });
      });
      it('should call _transporterSave if syncstatus is 2', function (done) {
        this.item._syncState = 2;
        this.item._synchronizeTransporter().then(() => {
          expect(this.item._transporterCreate).not.toHaveBeenCalled();
          expect(this.item._transporterSave).toHaveBeenCalled();
          expect(this.item._transporterDelete).not.toHaveBeenCalled();
          done();
        });
      });
      it('should call _transporterDelete if syncstatus is 3', function (done) {
        this.item._syncState = 3;
        this.item._synchronizeTransporter().then(() => {
          expect(this.item._transporterCreate).not.toHaveBeenCalled();
          expect(this.item._transporterSave).not.toHaveBeenCalled();
          expect(this.item._transporterDelete).toHaveBeenCalled();
          done();
        });
      });
      it('should do nothing if syncstatus is 0', function (done) {
        this.item._syncState = 0;
        this.item._synchronizeTransporter().then(() => {
          expect(this.item._transporterCreate).not.toHaveBeenCalled();
          expect(this.item._transporterSave).not.toHaveBeenCalled();
          expect(this.item._transporterDelete).not.toHaveBeenCalled();
          done();
        });
      });
    });

    describe('_transaction', function () {
      beforeEach(function () {
        this.transaction = jasmine.createSpy('transaction')
          .and.callFake(() => new Promise((resolve) => resolve()));
      });
      it('should generate unique transactionId and store it', function () {
        this.item._transactionId = undefined;
        this.item._transaction(this.transaction);
        expect(this.item._transactionId).toBeDefined();
      });
      it('should call the given function', function (done) {
        this.item._transaction(this.transaction)
          .then(() => {
            expect(this.transaction).toHaveBeenCalledTimes(1);
            done();
          });
      });
      it('should resolve if the current transactionId is the generated one', function (done) {
        this.item._transaction(this.transaction)
          .then(() => done());
      });
      it('should reject if the current transactionId is not the generated one', function (done) {
        let ends = 0;
        function end() {
          if (++ends === 2) {
            done();
          }
        }
        this.item._transaction(this.transaction)
          .catch(() => {
            end();
          });
        this.item._transaction(this.transaction)
          .then(() => {
            expect(this.transaction).toHaveBeenCalledTimes(2);
            end();
          });
      });
    });

    describe('_waitFor', function () {
      it('should resolve instant if key is set', function (done) {
        this.item.id = 'something';
        this.item._waitFor('id').then(done);
      });
      it('should resolve once key changes', function (done) {
        this.item.id = undefined;
        let triggered = false;
        this.item._waitFor('id')
          .then(() => {
            if (triggered) {
              done();
            } else {
              done(new Error('not triggered yet'));
            }
          });
        setTimeout(() => {
          triggered = true;
          this.item.id = 'someId';
        }, 1);
      });
      it('should dispose the autorunner after key is set', function (done) {
        this.item.id = undefined;
        this.item._waitFor('id')
          .then(done);
        this.item.id = 'someId';
        this.item.id = 'someOtherId';
        this.item.id = 'someId';
        this.item.id = 'someOtherId';
      });
      it('should work with id', function (done) {
        this.item.id = undefined;
        this.item._waitFor('id')
          .then(done);
        this.item.id = 'someId';
      });
      it('should work with _id', function (done) {
        this.item._id = undefined;
        this.item._waitFor('_id')
          .then(done);
        this.item._id = 'someId';
      });
    });
  });

  describe('interface methods', function () {
    it('get keys should throw interface error', function () {
      expect(() => Item.prototype.keys)
        .toThrowError('ITEM_IMPLEMENTATION_ERROR: get keys is not implemented');
    });
  });
});
