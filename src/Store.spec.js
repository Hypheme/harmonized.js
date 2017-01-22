import { isObservable, isObservableArray } from 'mobx';

import Store from './Store';
import BaseTransporter from './BaseTransporter';
import Schema from './Schema';

class SchemaStub extends Schema {
  constructor() {
    super({
      properties: {},
    });
  }
}
class TransporterStub extends BaseTransporter {
  constructor() {
    super({});
  }
}
class ClientStorageStub extends BaseTransporter {
  constructor() {
    super({});
  }
}
class Item {
  construct() {}
}

describe('Store', function () {
  describe('constructor', function () {
    beforeEach(function () {
      this.schema = new SchemaStub();
      this.clientStorage = new ClientStorageStub();
      spyOn(this.clientStorage, 'initialFetch')
      .and.returnValue(Promise.resolve({
        items: [], // TODO clientStorage items to create
      }));
      this.transporter = new TransporterStub();
      spyOn(this.transporter, 'initialFetch')
      .and.returnValue(Promise.resolve({
        items: [], // TODO transporter items to create
        toDelete: [],
      }));
    });
    it('should create a store and populate with fetched data', function () {
      const store = new Store({
        Item,
        schema: this.schema,
        transporter: this.transporter,
        clientStorage: this.clientStorage,
      });
      expect(store._Item).toEqual(Item);
      expect(store.transporter).toEqual(this.transporter);
      expect(store.clientStorage).toEqual(this.clientStorage);
      expect(store.loaded).toBe(false);
      expect(isObservable(store, 'loaded')).toBe(true);
      expect(isObservableArray(store.items)).toBe(true);
      return store.onceLoaded()
        .then(() => {
          // TODO expect data
        });
    });
    it('should switch to defaults if nothing is given');
    it('should throw if no schema is given', function () {
      expect(() => new Store({})).toThrow(new Error('undefined schema'));
    });
  });

  describe('public', function () {

  });

  describe('private', function () {

  });

  describe('interface', function () {

  });
});
