import {
  observable,
} from 'mobx';

import DefaultItem from './Item';
import EmptyTransporter from './Transporters/EmptyTransporter';
import { ROLE, SOURCE, STATE, PROMISE_STATE } from './constants';

export default class Store {

  @observable items = [];
  @observable loaded = false;
  incompleteItems = [];

  constructor({
    Item = DefaultItem,
    schema,
    transporter = new EmptyTransporter(),
    clientStorage = new EmptyTransporter(),
    options = { autoSave: true },
  }) {
    if (!schema) {
      throw new Error('undefined schema');
    }
    this.transporter = transporter;
    this.transporter.setEnvironment({ store: this, role: ROLE.TRANSPORTER });
    this.clientStorage = clientStorage;
    this.transporter.setEnvironment({ store: this, role: ROLE.CLIENT_STORAGE });
    this.schema = schema;
    this._options = options;
    this._Item = Item;

    this._isLoaded = {};
    this._isLoaded.promise = new Promise((resolve, reject) => {
      this._isLoaded.resolve = resolve;
      this._isLoaded.reject = reject;
    });

    this.clientStorage.initialFetch([])
    .then((csData) => {
      if (csData.status === PROMISE_STATE.RESOLVED) {
        csData.data.items.forEach((item) => {
          item._transporterState = this._castItemTransporterState(item._transporterState);
        });
        this._createItems(csData.data.items, SOURCE.CLIENT_STORAGE);
        return this.transporter.initialFetch(csData.data.items);
      }
      // for now we just go with a init error
      throw new Error('cannot build store if local storage is not available');
    })
    .then((tData) => {
      if (tData.status === PROMISE_STATE.RESOLVED) {
        tData.data.items.forEach((item) => {
          item._transporterState = this._castItemTransporterState(item._transporterState);
        });
        this._createItems(tData.data.items, SOURCE.TRANSPORTER);
        this._removeItems(tData.data.toDelete, SOURCE.TRANSPORTER);
      }
      // if we can't load from transporter we don't care as we get the items
      // from local storage anyway
      // NOTE: this part is likly to change, but we want to get the first alpha release outside
      // to get a bit of a feeling what is best right here.
    })
    .then(() => this._finishLoading())
    .catch(err => this._finishLoading(err));
  }

  // ///////////////////
  // PUBLIC METHODS   //
  // ///////////////////

  create(values, source = SOURCE.STATE) {
    // TODO block this methods while store hasnt loaded yet
    const item = new this._Item({ store: this, autoSave: this._options.autoSave });
    item.construct(values, { source });
    this.items.push(item);
    return item;
  }

  delete(item) {
    const index = this.incompleteItems.indexOf(item);
    if (index !== -1) {
      this.incompleteItems.splice(index, 1);
    }
  }

  fetchAndCreate(key, source) {
    return this.findOneOrFetch(key, source);
  }

  fetch(source = SOURCE.TRANSPORTER) {
    return this[source.NAME].fetchAll()
    .then((result) => {
      if (result.status === PROMISE_STATE.RESOLVED) {
        this._workFetchResult(this.items, result.data, 0, source);
      } else {
        throw new Error(`${source.NAME} is currently not available`);
      }
    });
  } // maybe? fetches again from the given SOURCE, defaults to transporter

  find(identifiers) {
    return this.items.filter(current => this._itemMatches(current, identifiers))
      .concat(this.incompleteItems.filter(current => this._itemMatches(current, identifiers)));
  }
  findOne(identifiers) {
    return this.items.find(current => this._itemMatches(current, identifiers))
     || this.incompleteItems.find(current => this._itemMatches(current, identifiers));
  }
  findOneOrFetch(key, source = SOURCE.TRANSPORTER) {
    const keyIdentifier = this.schema.getKeyIdentifierFor(source.AS_TARGET);
    if (!key[keyIdentifier]) {
      throw new Error(`missing identifier ${keyIdentifier}`);
    }
    return this.findOne({ [keyIdentifier]: key[keyIdentifier] }) ||
      this._createAndFetchFrom(key, source);
  }

  isLoaded() {
    return this.loaded;
  }

  onceLoaded() {
    return this._isLoaded.promise;
  }

  remove(item) {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items.splice(index, 1);
      this.incompleteItems.push(item);
    }
  }

  // ///////////////////
  // PRIVATE METHODS  //
  // ///////////////////

  _castItemTransporterState(rawState) {
    for (const state in STATE) {
      if (Object.prototype.hasOwnProperty.call(STATE, state)) {
        if (state === rawState) {
          return STATE[state];
        }
      }
    }
    return undefined;
  }

  _createAndFetchFrom(values, source) {
    const item = new this._Item({ store: this, autoSave: this._options.autoSave });
    item.construct(values, { source });
    item.fetch(source).then(() => {
      this.items.push(item);
      this.incompleteItems = this.incompleteItems.filter(incompleteItem => incompleteItem !== item);
    });
    this.incompleteItems.push(item);
    return item;
  }

  _createItems(rawItems, source) {
    return Promise.all(rawItems.map((rawItem) => {
      const item = new this._Item({ store: this, autoSave: this._options.autoSave });
      if (rawItem._transporterState === STATE.BEING_DELETED ||
        rawItem._transporterState === STATE.DELETED ||
        rawItem._transporterState === STATE.LOCKED) {
        this.incompleteItems.push(item);
      } else {
        this.items.push(item);
      }
      return item.construct(rawItem, { source });
    }));
  }

  _finishLoading(err) {
    if (err) {
      this.errored = true;
      this.error = err;
      this._isLoaded.reject(err);
    } else {
      this.loaded = true;
      this._isLoaded.resolve();
    }
  }

  _itemMatches(item, identifiers = {}) {
    for (const key in identifiers) {
      if (item[key] !== identifiers[key]) {
        return false;
      }
    }
    return true;
  }

  _removeItems(itemKeys, source) {
    const identifier = this.schema.getKeyIdentifierFor(source.AS_TARGET);
    return Promise.all(itemKeys.map(itemKey =>
      this.findOne({ [identifier]: itemKey[identifier] }).remove(source)));
  }

  _workFetchResult(storeItems, fetchItems, count, source) {
    // this is not very performant right now. But as we want to release the first
    // beta and aren't sure if this behavior stays the same anyway we go with this for now.
    const identifier = this.schema.getKeyIdentifierFor(source.AS_TARGET);
    const itemsToRemove = [];
    storeItems.forEach((storeItem) => {
      if (storeItem[identifier]) {
        const fetchItem = fetchItems.find(item => storeItem[identifier] === item[identifier]);
        // this is kinda bad style but as the array is never used after this
        // i think we should be fine
        if (fetchItem) {
          fetchItems.splice(fetchItems.indexOf(fetchItem), 1);
          storeItem.update(fetchItem, source);
        } else {
          itemsToRemove.push(storeItem);
        }
      }
    });
    // create all unused fetched items
    fetchItems.forEach(item => this.create(item, source));
    // remove all items not known and not being created
    itemsToRemove.forEach(item => item.remove(source));
  }
}
