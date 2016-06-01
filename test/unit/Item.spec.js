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
        get rawItemKeys() {
          return ['content'];
        }
      };
      spyOn(TestItem.prototype, '_stateHandler');
    });

    it('should store the given store in _store', function () {
      const testItem = new TestItem('myStore');
      expect(testItem._store).toBe('myStore');
    });

    it('should store the given values if they are in rawItemKeys', function () {
      const testItem = new TestItem('myStore', { content: 'my content', to: 'much' });
      expect(testItem.content).toBe('my content');
      expect(testItem.to).toBe(undefined);
    });

    it('should always store _id, id and _syncState', function () {
      const testItem = new TestItem('myStore', {
        _id: 'localId',
        id: 'transporterId',
        _syncState: 'localSyncState',
      });
      expect(testItem._id).toBe('localId');
      expect(testItem.id).toBe('transporterId');
      expect(testItem._syncState).toBe('localSyncState');
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
        get rawItemKeys() {
          return ['content', 'title'];
        }
        _stateHandler() {
          return this.rawItem;
        }
      }
      spyOn(TestItem.prototype, '_stateHandler').and.callThrough();
      spyOn(TestItem.prototype, '_synchronize')
        .and.returnValue(new Promise((resolve) => {
          resolve();
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

    describe('fetch', function () {
      // TODO chris
    });

    describe('remove', function () {
      // TODO chris
    });

    describe('save', function () {
      it('should call the set method and deliver value as parameter', function () {
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then(() => {
          expect(this.item.save).toHaveBeenCalledWith({
            content: 'my new content',
            title: 'my new title',
          });
        });
      });

      it('should keep the current autoSave value', function () {
        this.item.autoSave = false;
        this.item.save({
          content: 'my new content',
          title: 'my new title',
        }).then(() => {
          expect(this.item.autoSave).toBe(false);
        });
      });

      it('should save with no given values');
      // TODO this.item.save().then(...);
    });

    describe('saveLocal', function () {
      // TODO chris
      // NOTE you cant use this.saveLocal as it wont store the server id
      // use this._localStorageSave() instead. You will need to set the item content yourself though
    });

    describe('set', function () {
      it('should not sync if autoSave is false', function (done) {
        this.item.autoSave = false;
        this.item.set({ content: 'new content', title: 'my title' })
        .then(() => {
          expect(this.item._stateHandler).toHaveBeenCalledTimes(3);
          expect(this.item._synchronize).not.toHaveBeenCalled();
          done();
        });
      });
      it('should sync if autoSave is true', function (done) {
        this.item.autoSave = true;
        this.item.set({ content: 'new content', title: 'my title' })
        .then(() => {
          expect(this.item._stateHandler).toHaveBeenCalledTimes(3);
          expect(this.item._synchronize).toHaveBeenCalledTimes(1);
          done();
        });
      });
      it('should store all given values in keys before synchronizing', function (done) {
        this.item.autoSave = true;
        this.item.set({ content: 'new content', title: 'my title', anything: 'else' })
        .then(() => {
          expect(this.item.content).toBe('new content');
          expect(this.item.title).toBe('my title');
          expect(this.item.anything).toBe(undefined);
          done();
        });
      });
    });

    describe('rawItem', function () {
      it('should get all content of rawItemKeys', function () {
        expect(this.item.rawItem).toEqual({
          content: 'my content',
          title: 'a title',
        });
      });
    });

    describe('toTransporter', function () {
      it('should call rawItem', function () {
        expect(this.item.toTransporter).toEqual({
          id: 'serverId',
          content: 'my content',
          title: 'a title',
        });
      });
    });

    describe('toLocalStorage', function () {
      it('should call rawItem and add id, _id, _syncState', function () {
        expect(this.item.toLocalStorage).toEqual({
          id: 'serverId',
          _id: 'localId',
          _syncState: 0,
          content: 'my content',
          title: 'a title',
        });
      }); });
  });

  describe('privates', function () {
    beforeEach(function () {
      const propertySpy = jasmine.createSpy('propertySpy');
      this.propertySpy = propertySpy;
      class TestItem extends Item {
        @observable content;
        @observable title;
        get rawItemKeys() {
          return ['content', 'title'];
        }
        get rawItem() {
          propertySpy('rawItem');
          return super.rawItem;
        }
        set _syncState(state) {
          propertySpy('_syncState', state);
          super._syncState = state;
        }
        set _storeState(state) {
          propertySpy('_storeState', state);
          super._storeState = state;
        }
        get _syncState() {
          return super._syncState;
        }
        get _storeState() {
          return super._storeState;
        }
      }
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
        spyOn(this.item, '_transaction').and.callFake(function (routine) {
          return routine();
        });
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
          expect(this.propertySpy.calls.argsFor(0))
            .toEqual(['_storeState', 1]);
          expect(this.propertySpy.calls.argsFor(1))
            .toEqual(['_syncState', 2]);
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
    it('get rawItem should throw interface error');
    it('get rawItemKeys should throw interface error');
    it('get fromRawItem should throw interface error');
  });
});
