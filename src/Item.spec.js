import Item from './Item';
// import Store from '../test/unit/helpers/Test.Store';
import Transporter from '../test/unit/helpers/Test.Transporter';
import ClientStorage from '../test/unit/helpers/Test.ClientStorage';

import { /* ACTION, */ STATE, SOURCE, TARGET, PROMISE_STATE } from './constants';

import { genPromise } from './utils';

describe('Item', function () {
  // Core data. No test should alter this. Use stubs for your test logic
  // class ForeingStore extends Store {}
  // const foreignStore = new ForeingStore();
  const foreignItem = { _id: '123', foreign: 'item' };
  // const InternalStore = class InternalStore extends Store {};
  // const internalStoreInstance = new InternalStore();

  const testStore = new (class TestStore {
    remove() {}
    delete() {}
  })();
  testStore.transporter = new Transporter();
  testStore.clientStorage = new ClientStorage();
  const TestItem = class TestItem extends Item {
  };

  testStore.schema = {
    establishObservables: () => {},
    getObservables: () => {},
    setPrimaryKey: () => {},
    setFrom: () => {},
    getPrimaryKey: () => {},
    getFor: () => {},
  };

  beforeEach(function () {
  });

  describe('constructor', function () {
    let input;
    beforeEach(function () {
      // _synchronize is such a powerful function, we test it separatly as
      // it would blow up all other tests if we wouldn't
      input = {
        name: 'hans',
      };
      spyOn(TestItem.prototype, '_synchronize').and.callFake(function () {
        // face sync
        this._syncPromises.transporter.resolve();
        this._syncPromises.clientStorage.resolve();
      });
      spyOn(testStore.schema, 'getObservables').and.returnValue('something');
    });

    it('should create item from state', function () {
      spyOn(testStore.schema, 'establishObservables').and
        .returnValue('establishObservablesFromStateResponse');
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
        values: input,
        source: SOURCE.STATE,
      });
      expect(myItem.__id).toBeDefined();
      expect(myItem._transporterStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);
      return Promise.all([
        myItem.onceStored(),
        myItem.onceSynced(),
      ]).then(() => {
        expect(myItem._synchronize).toHaveBeenCalledWith(undefined, undefined, SOURCE.STATE, input);
        expect(testStore.schema.establishObservables)
          .toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
      }).then(() => {
        myItem._isReady.transporter.resolve();
        return myItem.onceReadyFor(TARGET.TRANSPORTER);
      }).then(() => {
        myItem._isReady.clientStorage.resolve();
        return myItem.onceReadyFor(TARGET.CLIENT_STORAGE);
      });
    });

    it('should create item from client storage', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'establishObservables').and
        .returnValue('establishObservablesClientStorageResponse');
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
        values: input,
        source: SOURCE.CLIENT_STORAGE,
      });
      expect(myItem._transporterStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      return Promise.all([
        myItem.onceStored(),
        myItem.onceSynced(),
      ]).then(() => {
        expect(testStore.schema.setPrimaryKey)
          .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, myItem, input);
        expect(testStore.schema.establishObservables)
          .toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(
          undefined, undefined, SOURCE.CLIENT_STORAGE, input,
        );
      }).then(() => {
        myItem._isReady.transporter.resolve();
        return myItem.onceReadyFor(TARGET.TRANSPORTER);
      }).then(() => myItem.onceReadyFor(TARGET.CLIENT_STORAGE));
    });

    it('should create item from client storage thats marked as removed', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'establishObservables').and
        .returnValue('establishObservablesClientStorageResponse');
      input._transporterState = STATE.BEING_DELETED;
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
        values: input,
        source: SOURCE.CLIENT_STORAGE,
      });
      expect(myItem._transporterStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: STATE.BEING_DELETED,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(true);
      expect(myItem.autoSave).toEqual(true);

      return Promise.all([
        myItem.onceStored(),
        myItem.onceSynced(),
      ]).then(() => {
        expect(testStore.schema.setPrimaryKey)
          .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, myItem, input);
        expect(testStore.schema.establishObservables)
          .toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(
          undefined, undefined, SOURCE.CLIENT_STORAGE, input,
        );
      });
    });

    it('should create item from transporter', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'establishObservables').and
        .returnValue(Promise.resolve('establishObservablesTransporterResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
        values: input,
        source: SOURCE.TRANSPORTER,
      });
      expect(myItem._transporterStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      return Promise.all([
        myItem.onceStored(),
        myItem.onceSynced(),
      ]).then(() => {
        expect(testStore.schema.setPrimaryKey)
          .toHaveBeenCalledWith(SOURCE.TRANSPORTER, myItem, input);
        expect(testStore.schema.establishObservables)
          .toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(
          undefined, undefined, SOURCE.TRANSPORTER, input,
        );
      }).then(() => myItem.onceReadyFor(TARGET.TRANSPORTER))
        .then(() => {
          myItem._isReady.clientStorage.resolve();
          return myItem.onceReadyFor(TARGET.CLIENT_STORAGE);
        });
    });
  });

  describe('methods', function () {
    beforeEach(function () {
      spyOn(TestItem.prototype, '_synchronize').and.callFake(function () {
        // face sync, we need to make sure this is async. As the real _synchronize
        // returns at least a Promise.resolve() (which is async), this should be save in all cases
        setTimeout(() => {
          this._syncPromises.transporter.resolve();
          this._syncPromises.transporter = genPromise();
          this._syncPromises.clientStorage.resolve();
          this._syncPromises.clientStorage = genPromise();
        }, 0);
      });
      spyOn(testStore.schema, 'establishObservables').and
        .returnValue('establishObservablesConstructorResponse');
      this.item = new TestItem({
        autoSave: true,
        store: testStore,
        values: {
          name: 'hans',
          foreignEntry: foreignItem, // relation by reference
        },
      });
      return Promise.all([
        this.item.onceStored(),
        this.item.onceSynced(),
      ]).then(() => {
        testStore.schema.establishObservables.calls.reset();
      });
    });

    describe('onceReadyFor', function () {
      it('should return the clientStorage promise', function () {
        expect(this.item.onceReadyFor(TARGET.CLIENT_STORAGE))
          .toEqual(this.item._isReady.clientStorage.promise);
      });
      it('should return the transporter promise', function () {
        expect(this.item.onceReadyFor(TARGET.TRANSPORTER))
          .toEqual(this.item._isReady.transporter.promise);
      });
    });

    describe('isReady', function () {
      it('should return true if item is ready', function () {
        expect(this.item.isReadyFor(TARGET.CLIENT_STORAGE))
          .toEqual(false);
      });
      it('should return true if item is ready', function () {
        this.item._setPrimaryKey(SOURCE.CLIENT_STORAGE, {});
        expect(this.item.isReadyFor(TARGET.CLIENT_STORAGE))
          .toEqual(true);
      });
    });

    function testOnceX({ method, target, status }) {
      describe(method, function () {
        it(`should resolve immediatly if item is ${status}`, function () {
          this.item[status] = true;
          this.item._syncPromises[target] = undefined;
          expect(this.item[method]().then).toBeDefined();
        });

        it('should resolve the _syncPromises', function () {
          this.item[status] = false;
          this.item._syncPromises[target] = genPromise();
          expect(this.item[method]()).toEqual(this.item._syncPromises[target].promise);
        });
      });
    }
    testOnceX({ method: 'onceStored', target: 'clientStorage', status: 'stored' });
    testOnceX({ method: 'onceSynced', target: 'transporter', status: 'synced' });

    describe('update', function () {
      it('should return item again', function () {
        expect(this.item.update('some data')).toEqual(this.item);
      });

      it('should update with values', function () {
        this.item.update('some data');
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.BEING_UPDATED, STATE.BEING_UPDATED, SOURCE.STATE, 'some data');
        });
      });

      it('should update with values from transporter', function () {
        this.item.update('some data', SOURCE.TRANSPORTER);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.BEING_UPDATED, STATE.EXISTENT, SOURCE.TRANSPORTER, 'some data');
        });
      });

      it('should update with values from clientStorage', function () {
        this.item.update('some data', SOURCE.CLIENT_STORAGE);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.EXISTENT, STATE.BEING_UPDATED, SOURCE.CLIENT_STORAGE, 'some data');
        });
      });
    });

    describe('remove', function () {
      beforeEach(function () {
        spyOn(this.item, '_dispose');
        spyOn(testStore, 'remove');
        spyOn(testStore, 'delete');
      });
      function checkRemove(item) {
        expect(item.removed).toBe(true);
        expect(testStore.remove).toHaveBeenCalledWith(item);
        expect();
      }
      function checkDispose(item) {
        expect(item._dispose).toHaveBeenCalled();
      }
      function checkDelete() {
        expect(testStore.delete).toHaveBeenCalled();
      }

      it('should return item again', function () {
        expect(this.item.remove()).toEqual(this.item);
      });

      it('should remove item from state', function () {
        this.item.remove();
        checkRemove(this.item);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          checkDelete(this.item);
          checkDispose(this.item);
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.BEING_UPDATED, STATE.BEING_DELETED, SOURCE.STATE);
        });
      });

      it('should remove item from transporter', function () {
        this.item.remove(SOURCE.TRANSPORTER);
        checkRemove(this.item);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          checkDispose(this.item);
          checkDelete(this.item);
          expect(this.item._transporterStates.current).toEqual(STATE.DELETED);
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.BEING_DELETED, undefined, SOURCE.TRANSPORTER);
        });
      });

      it('should remove item from clientStorage', function () {
        this.item.remove(SOURCE.CLIENT_STORAGE);
        checkRemove(this.item);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          checkDispose(this.item);
          checkDelete(this.item);
          expect(this.item._clientStorageStates.current).toEqual(STATE.DELETED);
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(undefined, STATE.BEING_DELETED, SOURCE.CLIENT_STORAGE);
        });
      });
    });

    describe('delete', function () {
      it('should call remove', function () {
        spyOn(this.item, 'remove');
        this.item.delete();
        expect(this.item.remove).toHaveBeenCalledTimes(1);
      });
    });

    describe('fetch', function () {
      it('should fetch from transporter', function () {
        this.item.fetch();
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(undefined, STATE.BEING_FETCHED, SOURCE.TRANSPORTER);
        });
      });
      it('should fetch from clientStorage', function () {
        this.item.fetch(SOURCE.CLIENT_STORAGE);
        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item._synchronize)
            .toHaveBeenCalledWith(STATE.BEING_FETCHED, undefined, SOURCE.CLIENT_STORAGE);
        });
      });
    });

    describe('_stateHandler', function () {
      beforeEach(function () {
        spyOn(testStore.schema, 'getObservables');
        this.item._synchronize.calls.reset();
      });

      it('should never sync on first call', function () {
        this.item._stateHandler(0);
        expect(testStore.schema.getObservables).toHaveBeenCalled();
        expect(this.item._synchronize).not.toHaveBeenCalled();
      });

      it('should synchronize when autoSave is on', function () {
        this.item._stateHandler(1);
        expect(testStore.schema.getObservables).toHaveBeenCalled();
        expect(this.item._synchronize)
          .toHaveBeenCalledWith(STATE.BEING_UPDATED, STATE.BEING_UPDATED, SOURCE.STATE);
      });

      it('should not synchronize when autoSave is off', function () {
        this.item.autoSave = false;
        this.item._stateHandler(1);
        expect(testStore.schema.getObservables).toHaveBeenCalled();
        expect(this.item._synchronize)
          .not.toHaveBeenCalled();
      });
    });

    describe('_synchronize', function () {
      const input = 'someInput';
      // const stubs = {
      //   transporter: {},
      //   clientStorage: {},
      // };
      beforeEach(function () {
        this.item._synchronize.and.callThrough();
        this.item._transporterStates = {
          current: STATE.EXISTENT,
          inProgress: undefined,
          next: undefined,
        };
        this.item._clientStorageStates = {
          current: STATE.EXISTENT,
          inProgress: undefined,
          next: undefined,
        };
        this.item.synced = true;
        this.item.stored = true;

        spyOn(testStore.schema, 'getPrimaryKey')
          .and.callFake((target) => {
            const result = target === TARGET.TRANSPORTER ?
              { id: 123 } : { _id: 456 };
            return result;
          });
        spyOn(testStore.schema, 'setFrom')
          .and.returnValue(Promise.resolve());
        spyOn(testStore.schema, 'getFor')
          .and.callFake((target, item, data) => {
            const result = Object.assign({}, data);
            result.data = target === TARGET.TRANSPORTER ?
              'transporter' : 'clientStorage';
            return new Promise(resolve => setTimeout(() => resolve(result), 0));
          });
        spyOn(testStore.schema, 'setPrimaryKey').and.returnValue(Promise.resolve());
      });

      it('should create item in client storage', function () {
        spyOn(testStore.clientStorage, 'create')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: { _id: 456 } }));
        this.item._clientStorageStates.current = undefined;

        this.item._synchronize(STATE.BEING_CREATED, STATE.EXISTENT, SOURCE.TRANSPORTER, input);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
          expect(testStore.clientStorage.create)
            .toHaveBeenCalledWith({
              data: 'clientStorage',
              _transporterState: STATE.EXISTENT.STATE,
            });
          expect(testStore.schema.getPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item,
              { _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.schema.setPrimaryKey)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, { _id: 456 });
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.TRANSPORTER, this.item, input);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
        });
      });

      it('should update an item in client storage', function () {
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT, SOURCE.TRANSPORTER, input);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
          expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({
              _id: 456,
              _transporterState: STATE.EXISTENT.STATE,
              data: 'clientStorage',
            });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item,
              { _id: 456, _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.TRANSPORTER, this.item, input);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
        });
      });

      it('should delete an item from client storage', function () {
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
          expect(testStore.clientStorage.delete)
            .toHaveBeenCalledWith({ _id: 456 });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.DELETED,
            inProgress: undefined,
            next: undefined,
          });
        });
      });

      it('should fetch an item from client storage', function () {
        spyOn(testStore.clientStorage, 'fetch')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED,
            data: {
              fetched: 'data',
            } }));

        this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
          expect(testStore.clientStorage.fetch)
            .toHaveBeenCalledWith({ _id: 456 });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, { fetched: 'data' });
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
        });
      });

      it('should create item in transporter', function () {
        spyOn(testStore.transporter, 'create')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: { id: 123 } }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._transporterStates.current = undefined;

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED, SOURCE.CLIENT_STORAGE, input);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.create)
            .toHaveBeenCalledWith({ data: 'transporter' });
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, {});
          expect(testStore.schema.setPrimaryKey)
            .toHaveBeenCalledWith(SOURCE.TRANSPORTER, this.item, { id: 123 });
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, input);
          expect(this.item._transporterStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
          // after syncing, we check if the new status is stored in our clientStorage
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, {
              _id: 456, _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({
              _id: 456,
              _transporterState: STATE.EXISTENT.STATE,
              data: 'clientStorage' });
        });
      });

      it('should update an item in transporter', function () {
        spyOn(testStore.transporter, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_UPDATED, SOURCE.CLIENT_STORAGE, input);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.update)
            .toHaveBeenCalledWith({ id: 123, data: 'transporter' });
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, { id: 123 });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, input);
          expect(this.item._transporterStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
          // after syncing, we check if the new status is stored in our clientStorage
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item,
              { _id: 456, _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({
              _id: 456,
              _transporterState: STATE.EXISTENT.STATE,
              data: 'clientStorage',
            });
        });
      });

      it('should delete an item from transporter', function () {
        spyOn(testStore.transporter, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.delete)
            .toHaveBeenCalledWith({ id: 123 });
          expect(testStore.schema.getFor)
            .not.toHaveBeenCalled();
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
          expect(this.item._transporterStates).toEqual({
            current: STATE.DELETED,
            inProgress: undefined,
            next: undefined,
          });
          // after syncing, we check if the new status is stored in our clientStorage
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .not.toHaveBeenCalled();
          expect(testStore.clientStorage.delete)
            .toHaveBeenCalledWith({ _id: 456 });
        });
      });

      it('should fetch an item from transporter', function () {
        spyOn(testStore.transporter, 'fetch')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED,
            data: {
              fetched: 'data',
            } }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_FETCHED);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.fetch)
            .toHaveBeenCalledWith({ id: 123 });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.TRANSPORTER, this.item, { fetched: 'data' });
          expect(this.item._transporterStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
          // after syncing, we check if the new status is stored in our clientStorage
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item,
              { _id: 456, _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({
              _id: 456,
              _transporterState: STATE.EXISTENT.STATE,
              data: 'clientStorage',
            });
        });
      });

      describe('merge next actions', function () {
        beforeEach(function () {
          this.item._transporterStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          };
          spyOn(this.item, '_triggerSync');
        });
        afterEach(function () {
          expect(this.item._triggerSync).not.toHaveBeenCalled();
        });

        it('should merge create and update to create', function () {
          this.item._clientStorageStates = {
            current: undefined,
            inProgress: undefined,
            next: STATE.BEING_CREATED,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: undefined,
            inProgress: undefined,
            next: STATE.BEING_CREATED,
          });
        });

        it('should merge create and delete to undefined', function () {
          this.item._clientStorageStates = {
            current: undefined,
            inProgress: undefined,
            next: STATE.BEING_CREATED,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          // TODO not completly sure about this one yet
          expect(this.item._clientStorageStates).toEqual({
            current: undefined,
            inProgress: undefined,
            next: undefined,
          });
        });

        it('should merge update and delete to delete', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_UPDATED,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_DELETED,
          });
        });

        it('should merge update and fetch to fetch', function () {
        // TODO: this can be discussed: if its converted to fetch all changes are overwritten
        // if its not changed, the item might get stuck
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_UPDATED,
          };
          this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_FETCHED,
          });
        });

        it('should merge update and update to update', function () {
        // TODO: this can be discussed: if its converted to fetch all changes are overwritten
        // if its not changed, the item might get stuck
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_UPDATED,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_UPDATED,
          });
        });

        it('should merge delete and anything to delete', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_DELETED,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_DELETED,
          });
        });

        it('should merge fetch and update to update', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_FETCHED,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_UPDATED,
          });
        });

        it('should merge fetch and delete to delete', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_FETCHED,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_DELETED,
          });
        });

        it('should merge fetch and fetch to fetch', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_FETCHED,
          };
          this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: STATE.BEING_FETCHED,
          });
        });

        it('should not merge if item is locked', function () {
          this.item._clientStorageStates = {
            current: STATE.LOCKED,
            inProgress: undefined,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.LOCKED,
            inProgress: undefined,
            next: undefined,
          });
        });

        it('should not merge if item is deleted', function () {
          this.item._clientStorageStates = {
            current: STATE.DELETED,
            inProgress: undefined,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.DELETED,
            inProgress: undefined,
            next: undefined,
          });
        });

        it('should not merge if item is being deleted', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_DELETED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_DELETED,
            next: undefined,
          });
        });

        it('should not merge if item is being deleted', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_DELETED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_DELETED,
            next: undefined,
          });
        });

        it('should merge update if item is being created', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: STATE.BEING_UPDATED,
          });
        });

        it('should merge delete if item is being created', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: STATE.BEING_DELETED,
          });
        });

        it('should merge fetch if item is being created', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_CREATED,
            next: STATE.BEING_FETCHED,
          });
        });

        it('should merge update if item is being updated', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: STATE.BEING_UPDATED,
          });
        });

        it('should merge delete if item is being updated', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: STATE.BEING_DELETED,
          });
        });

        it('should merge fetch if item is being updated', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_UPDATED,
            next: STATE.BEING_FETCHED,
          });
        });

        it('should merge delete if item is being fetched', function () {
          this.item._clientStorageStates = {
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_FETCHED,
            next: undefined,
          };
          this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: STATE.BEING_FETCHED,
            next: STATE.BEING_DELETED,
          });
        });
      });

      it('should remerge actions and update states if inProgress comes back pending', function () {
        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        spyOn(testStore.transporter, 'update')
          .and.returnValues(
            Promise.resolve({ status: PROMISE_STATE.PENDING, data: {} }),
            Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_UPDATED, SOURCE.CLIENT_STORAGE, input);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.update)
            .toHaveBeenCalledWith({ id: 123, data: 'transporter' });
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, { id: 123 });
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
          expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
          expect(testStore.schema.setFrom)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, input);
          expect(this.item._transporterStates).toEqual({
            current: STATE.EXISTENT,
            inProgress: undefined,
            next: undefined,
          });
          expect(testStore.transporter.onceAvailable).toHaveBeenCalled();
          // after syncing, we check if the new status is stored in our clientStorage
          expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
          expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item,
              { _id: 456, _transporterState: STATE.EXISTENT.STATE });
          expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({
              _id: 456,
              _transporterState: STATE.EXISTENT.STATE,
              data: 'clientStorage',
            });
        });
      });

      it('should work the next action if inProgress comes back resolved', function () {
        let syncs = 0;
        spyOn(testStore.clientStorage, 'update')
          .and.callFake(() => {
            if (syncs++ === 0) {
              this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
            }
            return Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} });
          });

        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
          expect(testStore.clientStorage.update.calls.count()).toBe(2);
        });
      });

      it('should redo the sync process if next action has changed in the preparation process', function () {
        // (we never reach clientStorage.update in this case)
        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
        this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.stored).toBe(true);
        });
      });

      it('just finish syncing if remerge actions results in no next state', function () {
        // (we never reach any clientStorage method in this case)

        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        this.item._transporterStates.current = undefined;

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED);
        this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
        });
      });

      it('just finish syncing if remerge actions results in no next state ' +
            'when inProgress comes back pending', function () {
        spyOn(testStore.transporter, 'onceAvailable')
          .and.callFake(() => {
            // we start another sync process and come back online
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);
            return Promise.resolve();
          });
        spyOn(testStore.transporter, 'create')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.PENDING, data: {} }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._transporterStates.current = undefined;

        this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED);

        return Promise.all([
          this.item.onceStored(),
          this.item.onceSynced(),
        ]).then(() => {
          expect(this.item.synced).toBe(true);
          expect(testStore.transporter.onceAvailable).toHaveBeenCalled();
        });
      });

      it('should resolve onceStored when done done', function () {
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
        return this.item.onceStored()
          .then(() => {
            expect(testStore.clientStorage.update)
              .toHaveBeenCalled();
          });
      });

      it('should resolve all onceStored when multilpe synchronize run in parallel', function (done) {
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));

        let endCount = 0;
        function end() {
          if (endCount++ === 1) {
            expect(testStore.clientStorage.update)
              .toHaveBeenCalledTimes(1);
            done();
          }
        }
        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
        this.item.onceStored().then(end);
        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
        this.item.onceStored().then(end);
      });

      it('should remove item if was not found in target', function () {
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.NOT_FOUND, data: {} }));
        spyOn(testStore.transporter, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore, 'remove');

        this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);

        return this.item.onceStored()
          .then(() => {
            expect(this.item.removed).toBe(true);
          });
      });

      it('should behave normally if not found in target and we wanted to delete anyway', function () {
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.NOT_FOUND, data: {} }));

        this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);

        return this.item.onceStored().then(() => {
          expect(this.item._clientStorageStates).toEqual({
            current: STATE.DELETED,
            inProgress: undefined,
            next: undefined,
          });
        });
      });
    });
  });
});
