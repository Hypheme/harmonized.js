
import Item from './Item';
// import Store from '../test/unit/helpers/Test.Store';
import Transporter from '../test/unit/helpers/Test.Transporter';
import ClientStorage from '../test/unit/helpers/Test.ClientStorage';

// import * as _ from 'lodash';
import {
  // observable,
  // autorun,
} from 'mobx';

import { /* ACTION,*/ STATE, SOURCE } from './constants';

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
    setFromState: () => {},
    setFromTransporter: () => {},
    setFromClientStorage: () => {},
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
    // TODO mock things
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
      spyOn(testStore.schema, 'setFromState').and
        .returnValue(Promise.resolve('setFromStateResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.STATE });
      expect(myItem._transporterState).toEqual(STATE.BEING_CREATED);
      expect(myItem._clientStorageState).toEqual(STATE.BEING_CREATED);
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setFromState)
          .toHaveBeenCalledWith(myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.BEING_CREATED, STATE.BEING_CREATED);
      });
    });

    it('should create item from client storage', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFromClientStorage').and
        .returnValue(Promise.resolve('setFromClientStorageResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.CLIENT_STORAGE });
      expect(myItem._transporterState).toEqual(STATE.BEING_CREATED);
      expect(myItem._clientStorageState).toEqual(STATE.EXISTENT);
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFromClientStorage)
          .toHaveBeenCalledWith(myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.EXISTENT, STATE.BEING_CREATED);
      });
    });

    it('should create item from client storage thats marked as removed', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFromClientStorage').and
        .returnValue(Promise.resolve('setFromClientStorageResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      input._transporterState = STATE.BEING_DELETED;
      const construction = myItem.construct(input, { source: SOURCE.CLIENT_STORAGE });
      expect(myItem._transporterState).toEqual(STATE.BEING_DELETED);
      expect(myItem._clientStorageState).toEqual(STATE.REMOVED);
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(true);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFromClientStorage)
          .toHaveBeenCalledWith(myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.REMOVED, STATE.BEING_DELETED);
      });
    });

    it('should create item from transporter', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFromTransporter').and
        .returnValue(Promise.resolve('setFromTransporterResponse'));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.TRANSPORTER });
      expect(myItem._transporterState).toEqual(STATE.EXISTENT);
      expect(myItem._clientStorageState).toEqual(STATE.BEING_CREATED);
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.then(() => {
        expect(testStore.schema.setPrimaryKey).toHaveBeenCalledWith(myItem, input);
        expect(testStore.schema.setFromTransporter)
          .toHaveBeenCalledWith(myItem, input, { establishObservables: true });
        expect(testStore.schema.getObservables).toHaveBeenCalledWith(myItem);
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.BEING_CREATED, STATE.EXISTENT);
      });
    });

    it('should error', function () {
      spyOn(testStore.schema, 'setPrimaryKey').and
        .returnValue('setPrimaryKeyResponse');
      spyOn(testStore.schema, 'setFromTransporter').and
        .returnValue(Promise.reject(new Error('some error')));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct(input, { source: SOURCE.TRANSPORTER });
      expect(myItem._transporterState).toEqual(STATE.EXISTENT);
      expect(myItem._clientStorageState).toEqual(STATE.BEING_CREATED);
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem._store).toEqual(testStore);
      return construction.catch(err => {
        expect(myItem._transporterState).toEqual(STATE.LOCKED);
        expect(myItem._clientStorageState).toEqual(STATE.LOCKED);
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
      this.item = new TestItem({
        autoSave: true,
        store: testStore,
      });
      return this.item.construct({
        name: 'hans',
        foreignEntry: foreignItem, // relation by reference
      }, { source: 'state' });
    });

    describe('_synchronize', function () {
      beforeEach(function () {
        this.item._synchronize.and.callThrough();
      });

      it('should create item in local storage');
      it('should update an item in local storage');
      it('should delete an item from local storage');
      it('should fetch an item from local storage');

      it('should create item in transporter');
      it('should update an item in transporter');
      it('should delete an item from transporter');
      it('should fetch an item from transporter');

      it('should merge next actions if something is already in progress');
      it('should remerge actions and update states if inProgress comes back pending');
      it('should work the next action if inProgress comes back resolved');
      it('should update state.current if inProgress comes back resolved and there is no next');
      it('should wait for all foreign keys before sending');
      it('should redo the sync process if next action has changed in the preparation process');
    });
  });
});
