
import Item from './Item';
import Store from '../test/unit/helpers/Test.Store';
import Transporter from '../test/unit/helpers/Test.Transporter';
import ClientStorage from '../test/unit/helpers/Test.ClientStorage';

import * as _ from 'lodash';
import {
  observable,
  autorun,
} from 'mobx';

import { ACTION, STATE } from './constants';


describe('Item', function () {
  // Core data. No test should alter this. Use stubs for your test logic
  class ForeingStore extends Store {}
  const foreignStore = new ForeingStore();
  const foreignItem = { _id: '123', foreign: 'item' };
  const InternalStore = class InternalStore extends Store {};
  const internalStoreInstance = new InternalStore();
  const testStore = new(class TestStore extends Store {})();
  testStore.transporter = new Transporter();
  testStore.clientStorage = new ClientStorage();
  const TestItem = class TestItem extends Item {
    @observable name
    @observable foreignEntry
  };
  TestItem.keys = [
    'name', {
      name: 'id',
      primary: true,
      key: 'id',
      _key: '_id',
    }, {
      name: 'foreignEntry',
      key: 'foreignId',
      _key: '_foreignId',
      store: foreignStore,
      storeKey: 'id',
      _storeKey: '_id',
    },
    // TODO
    // [{
    //   name: 'internalEntry',
    //   key: 'internalId',
    //   _key: '_internalId',
    //   store: this.InternalStore,
    // }],
  ];

  beforeEach(function () {
    // TODO mock things
  });

  describe('constructor', function () {
    beforeEach(function () {
      // _synchronize is such a powerful function, we test it separatly as
      // it would blow up all other tests if we wouldn't
      spyOn(TestItem.prototype, '_synchronize')
        .and.returnValue(Promise.resolve('syncResponse'));
    });

    it('should create item from state', function (done) {
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct({
        name: 'hans',
        foreignEntry: foreignItem, // relation by reference
      }, { source: 'state' });
      expect(myItem._syncState).toEqual(STATE.BEING_CREATED);
      expect(myItem._storeState).toEqual(STATE.BEING_CREATED);
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem.name).toEqual('hans');
      expect(myItem.foreignEntry).toEqual(foreignItem);

      expect(myItem._store).toEqual(testStore);
      construction.then(syncResponse => {
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.BEING_CREATED, STATE.BEING_CREATED);
        expect(syncResponse).toEqual('syncResponse');
        done();
      });
    });

    it('should create item from client storage', function (done) {
      spyOn(foreignStore, 'findOne').and.returnValue(foreignItem);
      spyOn(foreignStore, 'onceLoaded').and.returnValue(Promise.resolve());
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct({
        _syncState: STATE.BEING_CREATED,
        name: 'hans',
        _foreignId: foreignItem._id, // relation by client storage id
      }, { source: 'clientStorage' });
      expect(myItem._syncState).toEqual(STATE.BEING_CREATED);
      expect(myItem._storeState).toEqual(STATE.EXISTENT);
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem.name).toEqual('hans');

      expect(myItem._store).toEqual(testStore);
      // test if promise is returned and item is populated with foreign data
      construction.then(syncResponse => {
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.EXISTENT, STATE.BEING_CREATED);
        expect(myItem.foreignEntry).toEqual(foreignItem);
        expect(syncResponse).toEqual('syncResponse');
        done();
      });
    });
    it('should create item from client storage thats marked as removed', function (done) {
      spyOn(foreignStore, 'findOne').and.returnValue(foreignItem);
      spyOn(foreignStore, 'onceLoaded').and.returnValue(Promise.resolve());
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct({
        _syncState: STATE.BEING_DELETED,
        name: 'hans',
        _foreignId: foreignItem._id,
      }, { source: 'clientStorage' });
      expect(myItem._syncState).toEqual(STATE.BEING_DELETED);
      expect(myItem._storeState).toEqual(STATE.REMOVED);
      expect(myItem.stored).toBe(true);
      expect(myItem.synced).toBe(false);
      expect(myItem.removed).toBe(true);
      construction.then(() => {
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.REMOVED, STATE.BEING_DELETED);
        done();
      });
    });

    it('should create item from transporter', function (done) {
      spyOn(foreignStore, 'findOne').and.returnValue(foreignItem);
      spyOn(foreignStore, 'onceLoaded').and.returnValue(Promise.resolve());
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct({
        name: 'hans',
        foreignId: foreignItem.id, // relation by transporter id
      }, { source: 'transporter' });
      expect(myItem._syncState).toEqual(STATE.EXISTENT);
      expect(myItem._storeState).toEqual(STATE.BEING_CREATED);
      expect(myItem.stored).toBe(false);
      expect(myItem.synced).toBe(true);
      expect(myItem.removed).toBe(false);
      expect(myItem.autoSave).toEqual(true);

      expect(myItem.__id).toBeDefined();
      expect(myItem.name).toEqual('hans');

      expect(myItem._store).toEqual(testStore);
      // test if promise is returned and item is populated with foreign data
      construction.then(syncResponse => {
        expect(myItem._synchronize).toHaveBeenCalledWith(STATE.BEING_CREATED, STATE.EXISTENT);
        expect(myItem.foreignEntry).toEqual(foreignItem);
        expect(syncResponse).toEqual('syncResponse');
        done();
      });
    });

    fit('should error', function (done) {
      spyOn(foreignStore, 'onceLoaded').and.returnValue(Promise.reject(new Error('some error')));
      const myItem = new TestItem({
        autoSave: true,
        store: testStore,
      });
      const construction = myItem.construct({
        name: 'hans',
        foreignId: foreignItem.id, // relation by transporter id
      }, { source: 'transporter' });
      construction.catch(err => {
        expect(myItem._syncState).toEqual(STATE.LOCKED);
        expect(myItem._storeState).toEqual(STATE.LOCKED);
        expect(myItem.removed).toBe(true);
        expect(err).toEqual(new Error('some error'));
        expect(myItem._synchronize).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
