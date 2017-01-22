import { isObservable, isObservableArray } from 'mobx';

import Store from './Store';
import BaseTransporter from './BaseTransporter';
import Schema from './Schema';
import { SOURCE } from './constants';

import OriginalItem from './Item';
import OriginalEmptyTransporter from './Transporters/EmptyTransporter';


//
// setInterval(()=> {
//   import BaseTransporter from './BaseTransporter';
//
//   console.log('in tests:');
//   console.log(BaseTransporter);
// }, 100)

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
  constructor(arg) {
    this.constructorArg = arg;
  }
  construct(values) {
    this.testId = values.id || values._id;
    return Promise.resolve();
  }
  remove() {}
}

describe('Store', function () {
  describe('constructor', function () {
    beforeEach(function () {
      this.schema = new SchemaStub();
    });
    it('should create a store and populate with fetched data', function () {
      this.clientStorage = new ClientStorageStub();
      spyOn(this.clientStorage, 'initialFetch')
      .and.returnValue(Promise.resolve({
        items: [
          { _id: '1', _transporterState: 'BEING_DELETED' },
          { _id: '2', _transporterState: 'BEING_UPDATED' },
          { _id: '3', _transporterState: 'EXISTENT' },
          { _id: '4', _transporterState: 'BEING_CREATED' }],
      }));
      this.transporter = new TransporterStub();
      spyOn(this.transporter, 'initialFetch')
        .and.returnValue(Promise.resolve({
          items: [{ id: '5' }, { id: '6' }, { id: '7' }, { id: '8' }],
          toDelete: [{ id: '1' }, { id: '3' }],
        }));
      this.items = [new Item(1), new Item(3)];
      spyOn(Store.prototype, 'findOne').and.returnValues(this.items[0], this.items[1]);
      spyOn(this.items[0], 'remove').and.returnValue(Promise.resolve());
      spyOn(this.items[1], 'remove').and.returnValue(Promise.resolve());
      spyOn(Item.prototype, 'construct').and.callThrough();

      const store = new Store({
        Item,
        schema: this.schema,
        transporter: this.transporter,
        clientStorage: this.clientStorage,
        // options: { autoSave: true },
      });

      expect(store._Item).toEqual(Item);
      expect(store.transporter).toEqual(this.transporter);
      expect(store.clientStorage).toEqual(this.clientStorage);
      expect(store.loaded).toBe(false);
      expect(isObservable(store, 'loaded')).toBe(true);
      expect(isObservableArray(store.items)).toBe(true);
      return store.onceLoaded()
        .then(() => {
          function checkItem(item, id) {
            expect(item.testId).toBe(id);
            expect(item.constructorArg).toEqual({ store, autoSave: true });
          }
          expect(Item.prototype.construct).toHaveBeenCalledTimes(8);
          expect(store.items.length).toBe(7);
          checkItem(store.items[0], '2');
          checkItem(store.items[1], '3');
          checkItem(store.items[2], '4');
          checkItem(store.items[3], '5');
          checkItem(store.items[4], '6');
          checkItem(store.items[5], '7');
          checkItem(store.items[6], '8');
          expect(this.items[0].remove).toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE);
          expect(this.items[1].remove).toHaveBeenCalledWith(SOURCE.CLIENT_STORAGE);
        });
    });

    it('should switch to defaults if nothing is given', function () {
      spyOn(OriginalEmptyTransporter.prototype, 'setEnvironment');
      spyOn(OriginalEmptyTransporter.prototype, 'initialFetch')
      .and.returnValue(Promise.resolve({ items: [], toDelete: [] }));
      const store = new Store({
        schema: this.schema,
      });
      expect(store._Item).toEqual(OriginalItem);
      expect(store.transporter instanceof OriginalEmptyTransporter);
      expect(store.clientStorage instanceof OriginalEmptyTransporter);
      expect(store._options).toEqual({ autoSave: true });
    });
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
