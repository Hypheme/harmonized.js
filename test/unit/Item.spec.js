import Item from '../../src/Item';
import Store from './helpers/Test.Store';
import Transporter from './helpers/Test.Transporter';
import LocalStorage from './helpers/Test.LocalStorage';

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

  fdescribe('public', function () {
    beforeEach(function () {
      class TestItem extends Item {
        get rawItemKeys() {
          return ['content'];
        }
      }
      spyOn(TestItem.prototype, '_stateHandler');
      spyOn(TestItem.prototype, '_synchronize')
        .and.returnValue(new Promise((resolve) => {
          resolve();
        }));
      this.store = new Store({ Item: TestItem, Transporter, LocalStorage });
      this.item = new TestItem(this.store, {
        content: 'my content',
        _id: 'localId',
        id: 'serverId',
        _syncState: 0 });
    });

    describe('enableAutoSaveAndSave', function () {
      it('should return a promise', function (done) {
        this.item.enableAutoSaveAndSave().then(() => {
          done();
        });
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

    });

    describe('remove', function () {

    });

    describe('save', function () {

    });

    describe('saveLocal', function () {

    });

    describe('set', function () {

    });

    describe('toTransporter', function () {

    });

    describe('toLocalStorage', function () {

    });
  });

  describe('interface methods', function () {
    it('get rawItem should throw interface error');
    it('get rawItemKeys should throw interface error');
    it('get fromRawItem should throw interface error');
  });
});
