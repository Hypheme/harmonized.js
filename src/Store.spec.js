import { isObservable, isObservableArray } from 'mobx';

import Store from './Store';
import BaseTransporter from './BaseTransporter';
import Schema from './Schema';
import { SOURCE, PROMISE_STATE } from './constants';

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
    this._store = arg.store;
  }
  construct(values) {
    this.testId = values.id || values._id;
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        this[key] = values[key];
      }
    }
    return Promise.resolve();
  }
  isReadyFor() {
    return !!this.id;
  }
  remove() {}
  fetch() {}
  update(values) {
    for (const key in values) {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        this[key] = values[key];
      }
    }
  }
}

describe('Store', function () {
  beforeEach(function () {
    this.schema = new SchemaStub();
    spyOn(OriginalEmptyTransporter.prototype, 'setEnvironment');
    spyOn(OriginalEmptyTransporter.prototype, 'initialFetch')
    .and.returnValue(Promise.resolve({
      status: PROMISE_STATE.RESOLVED,
      data: { items: [], toDelete: [] },
    }));
  });
  describe('constructor', function () {
    it('should create a store and populate with fetched data', function () {
      this.clientStorage = new ClientStorageStub();
      spyOn(this.clientStorage, 'initialFetch')
      .and.returnValue(Promise.resolve({
        status: PROMISE_STATE.RESOLVED,
        data: {
          items: [
          { _id: '1', _transporterState: 'BEING_DELETED' },
          { _id: '2', _transporterState: 'BEING_UPDATED' },
          { _id: '3', _transporterState: 'EXISTENT' },
          { _id: '4', _transporterState: 'BEING_CREATED' }],
        },
      }));
      this.transporter = new TransporterStub();
      spyOn(this.transporter, 'initialFetch')
        .and.returnValue(Promise.resolve({
          status: PROMISE_STATE.RESOLVED,
          data: {
            items: [{ id: '5' }, { id: '6' }, { id: '7' }, { id: '8' }],
            toDelete: [{ id: '1' }, { id: '3' }],
          },
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
    it('should reject if client storage is not available', function () {
      this.clientStorage = new ClientStorageStub();
      spyOn(this.clientStorage, 'initialFetch')
      .and.returnValue(Promise.resolve({
        status: PROMISE_STATE.PENDING,
      }));
      const store = new Store({
        clientStorage: this.clientStorage,
        schema: this.schema,
      });
      return store.onceLoaded()
        .catch(err => expect(err)
        .toEqual(new Error('cannot build store if local storage is not available')));
    });
    // NOTE: this is to change
    it('should ignore if transporter is not available', function () {
      this.transporter = new TransporterStub();
      spyOn(this.transporter, 'initialFetch')
      .and.returnValue(Promise.resolve({
        status: PROMISE_STATE.PENDING,
      }));
      const store = new Store({
        transporter: this.transporter,
        schema: this.schema,
      });
      return store.onceLoaded();
    });
  });

  describe('methods', function () {
    beforeEach(function () {
      this.store = new Store({
        schema: this.schema,
        Item,
        // transporter: new TransporterStub(),
        // clientStorage: new ClientStorageStub(),
      });
      return this.store.onceLoaded()
      .then(() => {
        const store = this.store;
        function getItem(values) {
          const item = new Item({ store });
          item.construct(values);
          item.constructorArg = undefined;
          return item;
        }
        this.getItem = getItem;
        this.storeData = [];
        this.storeData.push(getItem({
          id: '1',
          name: 'hans',
          lastname: 'wurst',
        }));
        this.storeData.push(getItem({
          id: '2',
          name: 'hans',
          lastname: 'pan',
        }));
        this.storeData.push(getItem({
          id: '3',
          name: 'peter',
          lastname: 'wurst',
        }));
        this.storeData.push(getItem({
          id: '4',
          name: 'peter',
          lastname: 'pan',
        }));
        this.storeData.push(getItem({
          id: '5',
          name: 'hans',
          lastname: 'wurst',
        }));
        this.storeData.push(getItem({
          id: '6',
          name: 'hans',
          lastname: 'pan',
        }));
        this.storeData.push(getItem({
          name: 'peter',
          lastname: 'wurst',
        }));
        this.storeData.push(getItem({
          name: 'peter',
          lastname: 'pan',
        }));
        this.storeData.forEach(item => this.store.items.push(item));
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
      beforeEach(function () {
        OriginalEmptyTransporter.prototype.initialFetch
        .and.returnValue(new Promise((resolve, reject) => {
          this.resolve = () => resolve({
            status: PROMISE_STATE.RESOLVED,
            data: { items: [], toDelete: [] },
          });
          this.reject = () => reject(new Error('loading err'));
        }));
        this.store = new Store({
          schema: this.schema,
        });
      });
      it('should resolve immediatly', function (done) {
        this.resolve();
        this.store.onceLoaded().then(() => done());
      });
      it('should resolve once loaded', function (done) {
        this.store.onceLoaded().then(() => done());
        this.resolve();
      });
      it('should reject on loading error', function (done) {
        this.store.onceLoaded().catch((err) => {
          expect(err).toEqual(new Error('loading err'));
          done();
        });
        this.reject();
      });
    });

    describe('finds', function () {
      beforeEach(function () {
        this.incompleteStoreData = [{
          id: '11',
          name: 'hans',
          lastname: 'wurst',
        }, {
          id: '12',
          name: 'hans',
          lastname: 'pan',
        }, {
          id: '13',
          name: 'peter',
          lastname: 'wurst',
        }, {
          id: '14',
          name: 'peter',
          lastname: 'pan',
        }, {
          id: '15',
          name: 'hans',
          lastname: 'wurst',
        }, {
          id: '16',
          name: 'hans',
          lastname: 'pan',
        }, {
          id: '17',
          name: 'peter',
          lastname: 'wurst',
        }, {
          id: '18',
          name: 'peter',
          lastname: 'pan',
        }];
        this.incompleteStoreData.forEach(item => this.store.incompleteItems.push(item));
      });
      describe('find', function () {
        it('should find all items that matches all filters', function () {
          expect(this.store.find({ name: 'hans', lastname: 'wurst' }))
          .toEqual([
            this.storeData[0], this.storeData[4],
            this.incompleteStoreData[0], this.incompleteStoreData[4],
          ]);
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
        it('should return item from incompleteItems if nothing matches in store.items', function () {
          expect(this.store.findOne({ id: '11' }))
          .toBe(this.incompleteStoreData[0]);
        });
      });

      describe('findOneOrFetch', function () {
        beforeEach(function () {
          spyOn(this.store.schema, 'getKeyIdentifierFor').and.returnValue('id');
        });
        it('should return the first item that matches the primary key', function () {
          expect(this.store.findOneOrFetch({ id: '4' }))
            .toEqual(this.storeData[3]);
          expect(this.store.findOneOrFetch({ id: '11' }))
            .toEqual(this.incompleteStoreData[0]);
        });
        it('should fetch and create an item if no item matches and add it to the store as soon as it arrives', function (done) {
          let triggerResolve;
          spyOn(this.store._Item.prototype, 'construct');
          spyOn(this.store._Item.prototype, 'fetch').and
            .returnValue(new Promise((resolve) => { triggerResolve = resolve; }));
          const item = this.store.findOneOrFetch({ id: '10' });
          expect(item.construct).toHaveBeenCalledWith({ id: '10' }, { source: SOURCE.TRANSPORTER });
          expect(item.fetch).toHaveBeenCalledWith(SOURCE.TRANSPORTER);
          expect(this.store.incompleteItems[8]).toEqual(item);
          triggerResolve();
          setTimeout(() => {
            expect(this.store.incompleteItems[8]).toBe(undefined);
            expect(this.store.items[8]).toEqual(item);
            done();
          }, 0);
        });
        it('should throw if given filter is not a primary key', function () {
          expect(() => {
            this.store.findOneOrFetch({ noId: 4 });
          }).toThrow(new Error('missing identifier id'));
        });
      });
      describe('fetchAndCreate', function () {
        it('should be the same as findOneOrFetch', function () {
          spyOn(this.store, 'findOneOrFetch').and.returnValue('sth');
          expect(this.store.fetchAndCreate()).toEqual('sth');
          expect(this.store.findOneOrFetch).toHaveBeenCalled();
        });
      });
    });

    describe('fetch', function () {
      beforeEach(function () {
        spyOn(this.store.schema, 'getKeyIdentifierFor').and.returnValue('id');
        spyOn(this.store.transporter, 'fetchAll').and.returnValue(Promise.resolve({
          status: PROMISE_STATE.RESOLVED,
          data: [{
            id: '1',
            name: 'hans2',
            lastname: 'wurst',
          }, {
            id: '11',
            name: 'new',
            lastname: 'pan',
          }],
        }));
        spyOn(this.store.clientStorage, 'fetchAll').and.returnValue(Promise.resolve({
          status: PROMISE_STATE.PENDINGm,
        }));
        spyOn(this.store._Item.prototype, 'remove').and.callFake(function () {
          this._store.remove(this);
        });
      });
      it('should fetch from source and update store', function () {
        return this.store.fetch(SOURCE.TRANSPORTER)
          .then(() => {
            expect(this.store.items.length).toEqual(4);
            expect(this.store.transporter.fetchAll).toHaveBeenCalled();
          });
      });
      it('should default to fetch from transporter', function () {
        return this.store.fetch()
          .then(() => {
            expect(this.store.items.length).toEqual(4);
            expect(this.store.transporter.fetchAll).toHaveBeenCalled();
          });
      });
      it('should reject if service is offline', function () {
        return this.store.fetch(SOURCE.CLIENT_STORAGE)
          .catch((err) => {
            expect(this.store.clientStorage.fetchAll).toHaveBeenCalled();
            expect(err).toEqual(new Error('clientStorage is currently not available'));
          });
      });
      it('should remove all items that don\'t exist anymore', function () {
        return this.store.fetch()
          .then(() => {
            const items = this.store.items.filter(item =>
              ['2', '3', '4', '5', '6'].find(deletedId => deletedId === item.id));
            expect(items).toEqual([]);
            expect(Item.prototype.remove).toHaveBeenCalledTimes(5);
            expect(Item.prototype.remove).toHaveBeenCalledWith(SOURCE.TRANSPORTER);
          });
      });
      it('should update all items that already exist', function () {
        return this.store.fetch()
          .then(() => {
            const items = this.store.items.filter(item =>
              ['1'].find(updatedItemsId => updatedItemsId === item.id));
            expect(items).toEqual([this.storeData[0]]);
          });
      });
      it('should create non existing items', function () {
        return this.store.fetch()
          .then(() => {
            const newItem = this.store.items[this.store.items.length - 1];
            newItem.constructorArg = undefined;
            expect(newItem)
              .toEqual(this.getItem({
                id: '11',
                name: 'new',
                lastname: 'pan',
              }));
          });
      });
      it('should not touch not uploaded items', function () {
        return this.store.fetch()
          .then(() => {
            const items = this.store.items.filter(item => !item.id);
            expect(items).toEqual([this.storeData[6], this.storeData[7]]);
          });
      });
    });

    describe('remove', function () {
      it('should remove item from item arary and put it into remove array', function () {
        this.store.items = this.storeData;
        const item2Remove = this.storeData[1];
        this.store.remove(item2Remove);
        expect(this.store.items.find(item => item2Remove === item)).toEqual(undefined);
        expect(this.store.incompleteItems).toEqual([item2Remove]);
      });
      it('should not remove unkown items', function () {
        const length = this.storeData.length;
        this.store.items = this.storeData;
        const item2Remove = 'sth';
        this.store.remove(item2Remove);
        expect(this.store.items.length).toEqual(length);
        expect(this.store.incompleteItems).toEqual([]);
      });
    });

    describe('delete', function () {
      it('should remove an item from removedItem', function () {
        this.store.incompleteItems = this.storeData;
        const item2Remove = this.storeData[1];
        this.store.delete(item2Remove);
        expect(this.store.incompleteItems.find(item => item2Remove === item)).toEqual(undefined);
      });
      it('should not remove unkown items', function () {
        const length = this.storeData.length;
        this.store.incompleteItems = this.storeData;
        const item2Remove = 'sth';
        this.store.delete(item2Remove);
        expect(this.store.incompleteItems.length).toEqual(length);
      });
    });
  });
});
