import { isObservable, isObservableArray } from 'mobx';

import Store from './Store';
import BaseTransporter from './BaseTransporter';
import Schema from './Schema';
import { SOURCE } from './constants';

import OriginalItem from './Item';
import OriginalEmptyTransporter from './Transporters/EmptyTransporter';


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
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  initialFetch() {
    return this.promise;
  }
}
class ClientStorageStub extends BaseTransporter {
  constructor() {
    super({});
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  initialFetch() {
    return this.promise;
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
  fetch() {}
}

describe('Store', function () {
  beforeEach(function () {
    this.schema = new SchemaStub();
  });
  describe('constructor', function () {
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
          expect(this.items[0].remove).toHaveBeenCalledWith(SOURCE.TRANSPORTER);
          expect(this.items[1].remove).toHaveBeenCalledWith(SOURCE.TRANSPORTER);
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

  describe('methods', function () {
    beforeEach(function () {
      this.store = new Store({
        schema: this.schema,
        transporter: new TransporterStub(),
        clientStorage: new ClientStorageStub(),
      });
    });

    describe('isLoaded', function () {
      it('should return true', function () {
        this.store.loaded = true;
        expect(this.store.isLoaded()).toBe(true);
      });
      it('should return false', function () {
        this.store.loaded = false;
        expect(this.store.isLoaded()).toBe(false);
      });
    });

    describe('onceLoaded', function () {
      it('should resolve immediatly', function (done) {
        this.store._finishLoading();
        this.store.onceLoaded().then(() => done());
      });
      it('should resolve once loaded', function (done) {
        this.store.onceLoaded().then(() => done());
        this.store._finishLoading();
      });
    });

    describe('finds', function () {
      beforeEach(function () {
        this.storeData = [{
          id: '1',
          name: 'hans',
          lastname: 'wurst',
        }, {
          id: '2',
          name: 'hans',
          lastname: 'pan',
        }, {
          id: '3',
          name: 'peter',
          lastname: 'wurst',
        }, {
          id: '4',
          name: 'peter',
          lastname: 'pan',
        }, {
          id: '5',
          name: 'hans',
          lastname: 'wurst',
        }, {
          id: '6',
          name: 'hans',
          lastname: 'pan',
        }, {
          id: '7',
          name: 'peter',
          lastname: 'wurst',
        }, {
          id: '8',
          name: 'peter',
          lastname: 'pan',
        }];
        this.storeData.forEach(item => this.store.items.push(item));
      });

      describe('find', function () {
        it('should find all items that matches all filters', function () {
          expect(this.store.find({ name: 'hans', lastname: 'wurst' }))
          .toEqual([this.storeData[0], this.storeData[4]]);
        });
        it('should return an empty array if no item matches', function () {
          expect(this.store.find({ id: '10' }))
          .toEqual([]);
        });
      });

      describe('findOne', function () {
        it('should find the first item that machtes all filters', function () {
          expect(this.store.findOne({ name: 'peter', lastname: 'pan' }))
          .toEqual(this.storeData[3]);
        });
        it('should return undefined if no item matches', function () {
          expect(this.store.findOne({ id: '10' }))
          .toBe(undefined);
        });
      });

      describe('findOneOrFetch', function () {
        beforeEach(function () {
          spyOn(this.store.schema, 'getKeyIdentifierFor').and.returnValue('id');
        });
        it('should return the first item that matches the primary key', function () {
          expect(this.store.findOneOrFetch({ id: '4' }))
            .toEqual(this.storeData[3]);
        });
        it('should fetch and create an item if no item matches and add it to the store as soon as it arrives', function () {
          spyOn(this.store._Item.prototype, 'construct');
          spyOn(this.store._Item.prototype, 'fetch');
          const item = this.store.findOneOrFetch({ id: '10' });
          expect(item.construct).toHaveBeenCalledWith({ id: '10' }, { source: SOURCE.TRANSPORTER });
          expect(item.fetch).toHaveBeenCalledWith(SOURCE.TRANSPORTER);
        });
        it('should throw if given filter is not a primary key', function () {
          expect(() => {
            this.store.findOneOrFetch({ noId: 4 });
          }).toThrow(new Error('missing identifier id'));
        });
      });
    });
  });
});
