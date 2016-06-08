import Item from '../../src/Item';
import Store from './helpers/Test.Store';
import Transporter from './helpers/Test.Transporter';
import LocalStorage from './helpers/Test.LocalStorage';

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
          return ['content', 'title'];
        }
        _stateHandler() {
          return this.rawItem;
        }
      }
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
        spyOn(this.item._store.transporter, 'fetch').and.returnValue(new Promise((resolve) => resolve({
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

    describe('to***', function () {
      beforeEach(function () {
        class TestItem extends Item {
          @observable content;
          @observable title;
          get keys() {
            return ['content', 'title'];
          }
          _stateHandler() {
            return {
              title: this.title,
              content: this.content,
            };
          }
        }
        class Author extends Item {

          get keys() {
            return [];
          }
          _stateHandler() {
          }
        }
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
        this.item._keys = ['content', 'title',
          { key: 'author', store: 'authors',
            transporterKey: 'authorId', localStorageKey: '_authorId' },
          { key: 'anotherAuthor', store: 'authors',
            transporterKey: 'anotherAuthorId', localStorageKey: '_anotherAuthorId' }];
      });

      describe('toRawItem', function () {
      // TODO toRawItem
      });

      describe('toTransporter', function () {

        it('should get id and all keys stored in _keys', function (done) {
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
        it('should wait for all relations to be synced before resolving', function (done) {
          this.author.synced = false;
          this.anotherAuthor.synced = false;
          this.author.id = undefined;
          this.anotherAuthor.id = undefined;

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
          setTimeout(() => {
            this.author.id = 'authorId';
            this.author.synced = true;
            setTimeout(() => {
              this.anotherAuthor.id = 'anotherAuthorId';
              this.anotherAuthor.synced = true;
            }, 1);
          }, 1);
        });
        it('should cleanup all relation handlers', function (done) {
          this.author.id = undefined;
          this.author.synced = false;
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
          setTimeout(() => {
            this.author.id = 'authorId';
            this.author.synced = true;
            this.author.synced = false;
            this.author.synced = true;
            this.author.synced = false;
          }, 1);
        });
      });

      describe('toLocalStorage', function () {
      // TODO toLocalStorage
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
          return ['content', 'title'];
        }
        get rawItem() {
          propertySpy('rawItem');
          return super.rawItem;
        }
      }
      spyOn(TestItem.prototype, '_setSyncState').and.callThrough();
      spyOn(TestItem.prototype, '_setStoreState').and.callThrough();
      spyOn(TestItem.prototype, '_stateHandler');
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
          .and.returnValue(new Promise(resolve => resolve({ _id: 'localId' })));
        });
        it('should wrap async task in _transaction', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.item._transaction).toHaveBeenCalled();
            done();
          });
        });
        it('should save the returned _id in item', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.item._id).toBe('localId');
            done();
          });
        });
        it('should create item in local storage', function (done) {
          this.item._localStorageCreate().then(() => {
            expect(this.store.localStorage.create).toHaveBeenCalled();
            expect(this.store.localStorage.create).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              _id: undefined,
              id: 'serverId',
              _syncState: 1,
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
      });

      describe('_localStorageSave', function () {
        beforeEach(function () {
          this.item._id = 'localId';
          this.item._storeState = 2;
          spyOn(this.store.localStorage, 'save')
          .and.returnValue(new Promise(resolve => resolve()));
        });
        it('should wrap async task in _transaction', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.item._transaction).toHaveBeenCalled();
            done();
          });
        });
        it('should set _storeState to 0 after creation', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.item._storeState).toBe(0);
            done();
          });
        });
        it('should save item in localStorage', function (done) {
          this.item._localStorageSave().then(() => {
            expect(this.store.localStorage.save).toHaveBeenCalled();
            expect(this.store.localStorage.save).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              _id: 'localId',
              id: 'serverId',
              _syncState: 1,
            });
            done();
          });
        });
      });
      describe('_transporterCreate', function () {
        beforeEach(function () {
          this.item.id = undefined;
          this.item._syncState = 1;
          spyOn(this.store.transporter, 'create')
            .and.returnValue(new Promise(resolve => resolve({ id: 'serverId' })));
          spyOn(this.store.localStorage, 'save')
              .and.returnValue(new Promise(resolve => resolve()));
        });
        it('should wrap async tasks in _transaction', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(2);
            done();
          });
        });
        it('should set _syncState to 0 after creation', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item._syncState).toBe(0);
            done();
          });
        });
        it('should save serverId in item', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.item.id).toBe('serverId');
            done();
          });
        });
        it('should create item in transporter', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.store.transporter.create).toHaveBeenCalled();
            expect(this.store.transporter.create).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              id: undefined,
            });
            done();
          });
        });
        it('should save the new item content in localStorage', function (done) {
          this.item._transporterCreate().then(() => {
            expect(this.store.localStorage.save).toHaveBeenCalled();
            expect(this.store.localStorage.save).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              _id: 'localId',
              id: 'serverId',
              _syncState: 0,
            });
            done();
          });
        });
      });
      describe('_transporterDelete', function () {
        beforeEach(function () {
          this.item.id = 'serverId';
          this.item._syncState = 3;
          spyOn(this.store, 'remove');
          spyOn(this.store, 'delete');
          spyOn(this.store.transporter, 'delete')
            .and.returnValue(new Promise(resolve => resolve({ id: 'serverId' })));
          spyOn(this.store.localStorage, 'delete')
            .and.returnValue(new Promise(resolve => resolve()));
        });
        it('should wrap async tasks in _transaction', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(2);
            done();
          });
        });
        it('should set _syncState and _storeState to -1 after deleting', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.item._syncState).toBe(-1);
            expect(this.item._syncState).toBe(-1);
            done();
          });
        });
        it('should delete item in transporter', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.store.transporter.delete).toHaveBeenCalled();
            expect(this.store.transporter.delete).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              id: 'serverId',
            });
            done();
          });
        });
        it('should delete the item in localStorage', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.store.localStorage.delete).toHaveBeenCalled();
            expect(this.store.localStorage.delete).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              _id: 'localId',
              id: 'serverId',
              _syncState: -1,
            });
            done();
          });
        });
        it('should remove item from store in sync part', function () {
          this.item._transporterDelete();
          expect(this.store.remove).toHaveBeenCalledWith(this.item);
        });
        it('should delete item from store after async part', function (done) {
          this.item._transporterDelete().then(() => {
            expect(this.store.delete).toHaveBeenCalledWith(this.item);
            done();
          });
        });
      });
      describe('_transporterSave', function () {
        beforeEach(function () {
          this.item.id = 'serverId';
          this.item._syncState = 2;
          spyOn(this.store.transporter, 'save')
            .and.returnValue(new Promise(resolve => resolve({ id: 'serverId' })));
          spyOn(this.store.localStorage, 'save')
            .and.returnValue(new Promise(resolve => resolve()));
        });
        it('should wrap async tasks in _transaction', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.item._transaction).toHaveBeenCalledTimes(2);
            done();
          });
        });
        it('should set _syncState to 0 after saving', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.item._syncState).toBe(0);
            done();
          });
        });
        it('should save item in transporter', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.store.transporter.save).toHaveBeenCalled();
            expect(this.store.transporter.save).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              id: 'serverId',
            });
            done();
          });
        });
        it('should save the new item content in localStorage', function (done) {
          this.item._transporterSave().then(() => {
            expect(this.store.localStorage.save).toHaveBeenCalled();
            expect(this.store.localStorage.save).toHaveBeenCalledWith({
              content: 'my content',
              title: 'a title',
              _id: 'localId',
              id: 'serverId',
              _syncState: 0,
            });
            done();
          });
        });
      });
    });

    xdescribe('_set', function () {});
    describe('_setStoreState', function () {
      it('should set store state to given one', function () {
        const givenState = Math.floor((Math.random() * 10)) + 1;
        this.item._setStoreState(givenState);
        expect(this.item._storeState).toBe(givenState);
      });
      it('should not set store state if act store state is -1', function () {
        const givenState = Math.floor((Math.random() * 10)) + 1;
        this.item._storeState = -1;
        this.item._setStoreState(givenState);
        expect(this.item._storeState).toBe(-1);
      });
      it('should set stored to true if store state is 0', function () {
        this.item.stored = false;
        this.item._storeState = 1;
        this.item._setStoreState(0);
        expect(this.item.stored).toBe(true);
      });
      it('should set stored to false if store state is not 0', function () {
        this.item.stored = true;
        this.item._storeState = 0;
        this.item._setStoreState(1);
        expect(this.item.stored).toBe(false);
      });
    });
    describe('_setSyncState', function () {
      it('should set sync status to given status -1, 0, 1, 2, 3', function () {
        this.item._syncState = 0;
        this.item._setSyncState(-1);
        expect(this.item._syncState).toBe(-1);
        this.item._syncState = 1;
        this.item._setSyncState(0);
        expect(this.item._syncState).toBe(0);
        this.item._syncState = 0;
        this.item._setSyncState(1);
        expect(this.item._syncState).toBe(1);
        this.item._syncState = 0;
        this.item._setSyncState(2);
        expect(this.item._syncState).toBe(2);
        this.item._syncState = 0;
        this.item._setSyncState(3);
        expect(this.item._syncState).toBe(3);
      });
      it('should not set sync status with other numbers', function () {
        this.item._syncState = 0;
        this.item._setSyncState(-2);
        expect(this.item._syncState).toBe(0);
        this.item._syncState = 0;
        this.item._setSyncState(4);
        expect(this.item._syncState).toBe(0);
      });
      it('should not set sync status if old status is 3, -1 or -2', function () {
        const initialStates = [3, -1, -2];
        for (let i = 0; i < initialStates.length; i++) {
          const initialState = initialStates[i];
          this.item._syncState = initialState;
          this.item._setSyncState(0);
          expect(this.item._syncState).toBe(initialState);
          this.item._syncState = initialState;
          this.item._setSyncState(1);
          expect(this.item._syncState).toBe(initialState);
          this.item._syncState = initialState;
          this.item._setSyncState(2);
          expect(this.item._syncState).toBe(initialState);
        }
      });
      it('should always set sync status to -1 if thats the given one', function () {
        const initialStates = [-2, -1, 0, 1, 2, 3];
        for (let i = 0; i < initialStates.length; i++) {
          const initialState = initialStates[i];
          this.item._syncState = initialState;
          this.item._setSyncState(-1);
          expect(this.item._syncState).toBe(-1);
        }
      });
      it('should set status to -2 if given status and old status both equal 3', function () {
        this.item._syncState = 3;
        this.item._setSyncState(3);
        expect(this.item._syncState).toBe(-2);
      });
      it('should set synced to true if updated status is 0', function () {
        this.item._syncState = 1;
        this.item.synced = false;
        this.item._setSyncState(0);
        expect(this.item.synced).toBe(true);
      });
      it('should set synced to false if updated status is not 0', function () {
        const initialStates = [-2, -1, 1, 2, 3];
        for (let i = 0; i < initialStates.length; i++) {
          for (let j = 0; j < initialStates.length; j++) {
            const initialState = initialStates[i];
            const setState = initialStates[j];
            this.item._syncState = initialState;
            this.item._setSyncState(setState);
            expect(this.item.synced).toBe(false);
          }
        }
      });
    });
    describe('_stateHandler', function () {
      beforeEach(function () {
        this.item._stateHandler.and.callThrough();
        spyOn(this.item, '_synchronize');
      });
      it('should get computed rawItem in synchron part', function () {
        this.item._stateHandler(0);
        this.item._stateHandler(0);
        this.item._stateHandler(1);
        this.item._stateHandler(1);
        expect(this.propertySpy).toHaveBeenCalledTimes(1);
        expect(this.propertySpy.calls.mostRecent().args).toEqual(['rawItem']);
      });
      it('should synchronize(x, y) if its the first call', function () {
        this.item._storeState = 0;
        this.item._syncState = 1;
        this.item._stateHandler(0);
        expect(this.item._synchronize).toHaveBeenCalledTimes(1);
        expect(this.item._synchronize).toHaveBeenCalledWith(0, 1);
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
          .and.returnValue(new Promise(resolve => resolve()));
        spyOn(this.item, '_synchronizeTransporter')
          .and.returnValue(new Promise(resolve => resolve()));
      });
      it('should set states to given ones', function (done) {
        this.item._synchronize(1, 2).then(() => {
          expect(this.item._setStoreState).toHaveBeenCalledWith(1);
          expect(this.item._setSyncState).toHaveBeenCalledWith(2);
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
          .and.returnValue(new Promise(resolve => resolve()));
        spyOn(this.item, '_localStorageSave')
          .and.returnValue(new Promise(resolve => resolve()));
      });
      it('should call _localStorageCreate if storestatus is 1', function (done) {
        this.item._storeState = 1;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).toHaveBeenCalled();
          expect(this.item._localStorageSave).not.toHaveBeenCalled();
          done();
        });
      });
      it('should call _localStorageSave if storestatus is 2', function (done) {
        this.item._storeState = 2;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).not.toHaveBeenCalled();
          expect(this.item._localStorageSave).toHaveBeenCalled();
          done();
        });
      });
      it('should do nothing if storestatus is 0', function (done) {
        this.item._storeState = 0;
        this.item._synchronizeLocalStorage().then(() => {
          expect(this.item._localStorageCreate).not.toHaveBeenCalled();
          expect(this.item._localStorageSave).not.toHaveBeenCalled();
          done();
        });
      });
    });
    describe('_synchronizeTransporter', function () {
      beforeEach(function () {
        spyOn(this.item, '_transporterCreate')
          .and.returnValue(new Promise(resolve => resolve()));
        spyOn(this.item, '_transporterSave')
          .and.returnValue(new Promise(resolve => resolve()));
        spyOn(this.item, '_transporterDelete')
          .and.returnValue(new Promise(resolve => resolve()));
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
  });

  describe('interface methods', function () {
    it('get keys should throw interface error', function () {
      expect(() => Item.prototype.keys)
        .toThrowError('ITEM_IMPLEMENTATION_ERROR: get keys is not implemented');
    });
  });
});
