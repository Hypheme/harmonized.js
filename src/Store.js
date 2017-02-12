import {
  observable,
} from 'mobx';

import DefaultItem from './Item';
import EmptyTransporter from './Transporters/EmptyTransporter';
import { ROLE, SOURCE, STATE, PROMISE_STATE } from './constants';

export default class Store {

  @observable items = [];
  @observable loaded = false;
  // @observable deletedItems = [];
  constructor({
    Item = DefaultItem, schema,
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
        return this.transporter.initialFetch(csData.items);
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
    const item = new this._Item({ store: this, autoSave: this._options.autoSave });
    item.construct(values, { source });
    this.items.push(item);
    return item;
  }

  fetchAndCreate(key, source) {
    return this.findOneOrFetch(key, source);
  }

  fetch(source) {
    // const keyIdentifier = this.schema.getKeyIdentifierFor(source.AS_TARGET);
    this[source.NAME].fetchAll()
    .then((result) => {
      if (result.status === PROMISE_STATE.RESOLVED) {
        // TODO delete all items that don't exist anymore (and aren't being created)
        // TODO update all items, that are already existent
        // TODO create new items, that aren't existent
      } else {
        throw new Error(`${SOURCE.NAME} is currently not available`);
      }
    });
  } // maybe? fetches again from the given SOURCE, defaults to transporter

  find(identifiers) {
    return this.items.filter(current => this._itemMatches(current, identifiers));
  }
  findOne(identifiers) {
    return this.items.find(current => this._itemMatches(current, identifiers));
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

  remove() {}

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
    item.fetch(source);
    return item;
  }

  _createItems(rawItems, source) {
    return Promise.all(rawItems.map((rawItem) => {
      const item = new this._Item({ store: this, autoSave: this._options.autoSave });
      if (rawItem._transporterState !== STATE.BEING_DELETED &&
        rawItem._transporterState !== STATE.DELETED &&
        rawItem._transporterState !== STATE.LOCKED) {
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

}
