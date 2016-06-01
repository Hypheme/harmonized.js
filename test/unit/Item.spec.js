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
          id: 'serverId',
          _id: 'localId',
          _syncState: 0,
          content: 'my content',
          title: 'a title',
        });
      });
    });

    describe('toTransporter', function () {
      it('should call rawItem', function () {
        expect(this.item.toTransporter).toEqual({
          id: 'serverId',
          _id: 'localId',
          _syncState: 0,
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
      const propertySpy = jasmine.createSpy('whatAmI');
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
      }
      spyOn(TestItem.prototype, '_stateHandler');
      this.store = new Store({ Item: TestItem, Transporter, LocalStorage });
      this.item = new TestItem(this.store, {
        content: 'my content',
        title: 'a title',
        _id: 'localId',
        id: 'serverId',
        _syncState: 1 });
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
        expect(this.propertySpy).toHaveBeenCalledWith('rawItem');
      });
      it('should synchronize(x, y) if its the first call', function () {
        this._storeState = 0;
        this._syncState = 1;
        this.item._stateHandler(0);
        expect(this.item._synchronize).toHaveBeenCalledTimes(1);
        expect(this.item._synchronize).toHaveBeenCalledWith(0, 1);
      });
      it('should synchronize(2, 2) if autoSave is on and its not the first call', function () {
        this._storeState = 0;
        this._syncState = 1;
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
  });

  describe('interface methods', function () {
    it('get rawItem should throw interface error');
    it('get rawItemKeys should throw interface error');
    it('get fromRawItem should throw interface error');
  });
});
