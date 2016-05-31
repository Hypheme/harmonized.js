import { Item } from '../../src';

describe('Item', function () {
  fdescribe('constructor', function () {
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
  });

  describe('public', function () {
    describe('enableAutoSaveAndSave', function () {

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
