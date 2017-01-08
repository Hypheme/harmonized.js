
import Item from './Item';
// import Store from '../test/unit/helpers/Test.Store';
import Transporter from '../test/unit/helpers/Test.Transporter';
import ClientStorage from '../test/unit/helpers/Test.ClientStorage';

// import * as _ from 'lodash';
import {
  // observable,
  autorun,
} from 'mobx';

import { /* ACTION,*/ STATE, SOURCE, TARGET, PROMISE_STATE } from './constants';

describe('Item', function () {
  // Core data. No test should alter this. Use stubs for your test logic
  // class ForeingStore extends Store {}
  // const foreignStore = new ForeingStore();
  const foreignItem = { _id: '123', foreign: 'item' };
  // const InternalStore = class InternalStore extends Store {};
  // const internalStoreInstance = new InternalStore();

  const testStore = new(class TestStore {})();
  testStore.transporter = new Transporter();
  testStore.clientStorage = new ClientStorage();
  const TestItem = class TestItem extends Item {
  };

  testStore.schema = {
    getObservables: () => {},
    setPrimaryKey: () => {},
    setFrom: () => {},
    getPrimaryKey: () => {},
    getFor: () => {},
  // [
  //   'name', {
  //     name: 'id',
  //     primary: true,
  //     key: 'id',
  //     _key: '_id',
  //   }, {
  //     name: 'foreignEntry',
  //     key: 'foreignId',
  //     _key: '_foreignId',
  //     store: foreignStore,
  //     storeKey: 'id',
  //     _storeKey: '_id',
  //   },
    // TODO
    // [{
    //   name: 'internalEntry',
    //   key: 'internalId',
    //   _key: '_internalId',
    //   store: this.InternalStore,
    // }],
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
      spyOn(TestItem.prototype, '_synchronize');
      spyOn(testStore.schema, 'getObservables').and.returnValue('something');
    });

    it('should create item from state', function () {
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.resolve('setFromStateResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.STATE });
      expect(myItem._transporterStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: STATE.BEING_CREATED,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: STATE.BEING_CREATED,
      });
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setFrom)
          .toHaveBeenCalledWith(SOURCE.STATE, myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith();
      });
    });

    it('should create item from client storage', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.resolve('setFromClientStorageResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.CLIENT_STORAGE });
      expect(myItem._transporterStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: STATE.BEING_CREATED,
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

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFrom)
          .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, myItem, input,
            { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith();
      });
    });

    it('should create item from client storage thats marked as removed', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.resolve('setFromClientStorageResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      input._transporterState = STATE.BEING_DELETED;
      const construction = myItem.construct(input, { source: SOURCE.CLIENT_STORAGE });
      expect(myItem._transporterStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: STATE.BEING_DELETED,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: STATE.REMOVED,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(true);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFrom)
          .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, myItem, input,
            { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith();
      });
    });

    it('should create item from transporter', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.resolve('setFromTransporterResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.TRANSPORTER });
      expect(myItem._transporterStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: STATE.BEING_CREATED,
      });
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFrom)
          .toHaveBeenCalledWith(SOURCE.TRANSPORTER, myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith();
      });
    });

    it('should error', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.reject(new Error('some error')));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.TRANSPORTER });
      expect(myItem._transporterStates).toEqual({
        current: STATE.EXISTENT,
        inProgress: undefined,
        next: undefined,
      });
      expect(myItem._clientStorageStates).toEqual({
        current: undefined,
        inProgress: undefined,
        next: STATE.BEING_CREATED,
      });
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.catch(err => {
        expect(myItem._transporterStates).toEqual({
          current: STATE.LOCKED,
          inProgress: undefined,
          next: undefined,
        });
        expect(myItem._clientStorageStates).toEqual({
          current: STATE.LOCKED,
          inProgress: undefined,
          next: undefined,
        });
        expect(myItem.removed).toBe(true);
        expect(err).toEqual(new Error('some error'));
        expect(myItem._synchronize).not.toHaveBeenCalled();
      });
    });
  });

  describe('methods', function () {
    beforeEach(function () {
      spyOn(TestItem.prototype, '_synchronize')
        .and.returnValue(Promise.resolve('syncResponse'));
      spyOn(testStore.schema, 'setFrom').and
        .returnValue(Promise.resolve('setFromConstructorResponse'));
      this.item = new TestItem({
        autoSave: true,
        store: testStore,
      });
      return this.item.construct({
        name: 'hans',
        foreignEntry: foreignItem, // relation by reference
      }, { source: 'state' }).then(() => {
        testStore.schema.setFrom.calls.reset();
      });
    });

    describe('_stateHandler', function () {
      beforeEach(function () {
        spyOn(testStore.schema, 'getObservables');
        this.item._synchronize.calls.reset();
      });

      it('should always sync on first call', function () {
        this.item._stateHandler(0);
        expect(testStore.schema.getObservables).toHaveBeenCalled();
        expect(this.item._synchronize).toHaveBeenCalledWith();
      });

      it('should synchronize when autoSave is on', function () {
        this.item._stateHandler(1);
        expect(testStore.schema.getObservables).toHaveBeenCalled();
        expect(this.item._synchronize)
          .toHaveBeenCalledWith(STATE.BEING_UPDATED, STATE.BEING_UPDATED);
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
      // const stubs = {
      //   transporter: {},
      //   clientStorage: {},
      // };
      beforeEach(function () {
        this.item._synchronize.and.callThrough();
        this.item._transporterStates = {
          current: undefined,
          inProgress: undefined,
          next: undefined,
        };
        this.item._clientStorageStates = {
          current: undefined,
          inProgress: undefined,
          next: undefined,
        };
        spyOn(testStore.schema, 'getPrimaryKey')
          .and.callFake(target => {
            const result = target === TARGET.TRANSPORTER ?
              { id: 123 } : { _id: 456 };
            return result;
          });
        spyOn(testStore.schema, 'getFor')
          .and.callFake((target, item, data) => {
            const result = Object.assign({}, data);
            result.data = target === TARGET.TRANSPORTER ?
              'transporter' : 'clientStorage';
            return new Promise(resolve => setTimeout(() => resolve(result), 0));
          });
        spyOn(testStore.schema, 'setPrimaryKey').and.returnValue(Promise.resolve());
      });

      it('should create item in client storage', function (done) {
        spyOn(testStore.clientStorage, 'create')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: { _id: 456 } }));
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.clientStorage.create)
            .toHaveBeenCalledWith({ data: 'clientStorage' });
            expect(testStore.schema.getPrimaryKey)
            .not.toHaveBeenCalled();
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, {});
            expect(testStore.schema.setPrimaryKey)
            .toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
            expect(this.item._clientStorageStates).toEqual({
              current: STATE.EXISTENT,
              inProgress: undefined,
              next: undefined,
            });
            done();
          } else {
            this.item._synchronize(STATE.BEING_CREATED, STATE.EXISTENT);
          }
        });
      });
      it('should update an item in client storage', function (done) {
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._transporterStates.current = STATE.EXISTENT;
        this.item._clientStorageStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({ _id: 456, data: 'clientStorage' });
            expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
            expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
            expect(this.item._clientStorageStates).toEqual({
              current: STATE.EXISTENT,
              inProgress: undefined,
              next: undefined,
            });
            done();
          } else {
            this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          }
        });
      });
      it('should delete an item from client storage', function (done) {
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._transporterStates.current = STATE.EXISTENT;
        this.item._clientStorageStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
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
            done();
          } else {
            this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          }
        });
      });
      it('should fetch an item from client storage', function (done) {
        spyOn(testStore.clientStorage, 'fetch')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {
            fetched: 'data',
          } }));
        this.item._transporterStates.current = STATE.EXISTENT;
        this.item._clientStorageStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
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
            done();
          } else {
            this.item._synchronize(STATE.BEING_FETCHED, STATE.EXISTENT);
          }
        });
      });

      it('should create item in transporter', function (done) {
        spyOn(testStore.transporter, 'create')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: { id: 123 } }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.transporter.create)
            .toHaveBeenCalledWith({ data: 'transporter' });
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, {});
            expect(testStore.schema.setPrimaryKey)
            .toHaveBeenCalledWith(SOURCE.TRANSPORTER, this.item, { id: 123 });
            expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
            expect(this.item._transporterStates).toEqual({
              current: STATE.EXISTENT,
              inProgress: undefined,
              next: undefined,
            });
            // after syncing, we check if the new status is stored in our clientStorage
            expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({ _id: 456, data: 'clientStorage' });
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED);
          }
        });
      });

      it('should update an item in transporter', function (done) {
        spyOn(testStore.transporter, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.transporter.update)
            .toHaveBeenCalledWith({ id: 123, data: 'transporter' });
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, { id: 123 });
            expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
            expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
            expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
            expect(this.item._transporterStates).toEqual({
              current: STATE.EXISTENT,
              inProgress: undefined,
              next: undefined,
            });
            // after syncing, we check if the new status is stored in our clientStorage
            expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item);
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({ _id: 456, data: 'clientStorage' });
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_UPDATED);
          }
        });
      });

      it('should delete an item from transporter', function (done) {
        spyOn(testStore.transporter, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'delete')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
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
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);
          }
        });
      });

      it('should fetch an item from transporter', function (done) {
        spyOn(testStore.transporter, 'fetch')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {
            fetched: 'data',
          } }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
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
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({ _id: 456, data: 'clientStorage' });
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_FETCHED);
          }
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

      it('should remerge actions and update states if inProgress comes back pending',
      function (done) {
        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        spyOn(testStore.transporter, 'update')
          .and.returnValues(
            Promise.resolve({ status: PROMISE_STATE.PENDING, data: {} }),
            Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        spyOn(testStore.clientStorage, 'update')
          .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.transporter.update)
            .toHaveBeenCalledWith({ id: 123, data: 'transporter' });
            expect(testStore.schema.getFor)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item, { id: 123 });
            expect(testStore.schema.getPrimaryKey)
            .toHaveBeenCalledWith(TARGET.TRANSPORTER, this.item);
            expect(testStore.schema.setPrimaryKey)
            .not.toHaveBeenCalled();
            expect(testStore.schema.setFrom)
            .not.toHaveBeenCalled();
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
            .toHaveBeenCalledWith(TARGET.CLIENT_STORAGE, this.item, { _id: 456 });
            expect(testStore.clientStorage.update)
            .toHaveBeenCalledWith({ _id: 456, data: 'clientStorage' });
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_UPDATED);
          }
        });
      });

      it('should work the next action if inProgress comes back resolved',
      function (done) {
        let syncs = 0;
        spyOn(testStore.clientStorage, 'update')
          .and.callFake(() => {
            if (syncs++ === 0) {
              this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
            }
            return Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} });
          });
        this.item._transporterStates.current = STATE.EXISTENT;
        this.item._clientStorageStates.current = STATE.EXISTENT;
        let call = 0;
        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            dispose();
            expect(result).toBe(true);
            expect(testStore.clientStorage.update.calls.count()).toBe(2);
            done();
          } else {
            this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
          }
        });
      });

      it('should redo the sync process if next action has changed in the preparation process',
      function (done) {
        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        spyOn(testStore.clientStorage, 'delete')
            .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = STATE.EXISTENT;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.stored;
          if (call++ === 1) {
            expect(result).toBe(true);
            dispose();
            done();
          } else {
            this.item._synchronize(STATE.BEING_UPDATED, STATE.EXISTENT);
            this.item._synchronize(STATE.BEING_DELETED, STATE.EXISTENT);
          }
        });
      });

      it('just finish syncing if remerge actions results in no next state',
      function (done) {
        spyOn(testStore.transporter, 'onceAvailable')
          .and.returnValue(Promise.resolve());
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = undefined;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            expect(result).toBe(true);
            dispose();
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED);
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);
          }
        });
      });

      it('just finish syncing if remerge actions results in no next state ' +
            'when inProgress comes back pending', function (done) {
        spyOn(testStore.transporter, 'onceAvailable')
        .and.callFake(() => {
          this.item._synchronize(STATE.EXISTENT, STATE.BEING_DELETED);
          return Promise.resolve();
        });
        spyOn(testStore.transporter, 'create')
        .and.returnValue(
          Promise.resolve({ status: PROMISE_STATE.PENDING, data: {} }));
        spyOn(testStore.clientStorage, 'update')
        .and.returnValue(Promise.resolve({ status: PROMISE_STATE.RESOLVED, data: {} }));
        this.item._clientStorageStates.current = STATE.EXISTENT;
        this.item._transporterStates.current = undefined;
        let call = 0;

        const dispose = autorun(() => {
          const result = this.item.synced;
          if (call++ === 1) {
            expect(result).toBe(true);
            expect(testStore.transporter.onceAvailable).toHaveBeenCalled();
            dispose();
            done();
          } else {
            this.item._synchronize(STATE.EXISTENT, STATE.BEING_CREATED);
          }
        });
      });
    });
  });
});
