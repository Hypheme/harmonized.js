import {
  observable,
} from 'mobx';

import DefaultItem from './Item';
import EmptyTransporter from './Transporters/EmptyTransporter';
import { ROLE, SOURCE, STATE } from './constants';

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
      csData.items.forEach((item) => {
        item._transporterState = this._castItemTransporterState(item._transporterState);
      });
      this._createItems(csData.items, SOURCE.CLIENT_STORAGE);
      return this.transporter.initialFetch(csData.items);
    })
    .then((tData) => {
      tData.items.forEach((item) => {
        item._transporterState = this._castItemTransporterState(item._transporterState);
      });
      this._createItems(tData.items, SOURCE.TRANSPORTER);
      this._removeItems(tData.toDelete, SOURCE.TRANSPORTER);
    })
    .then(() => this._finishLoading());
  }

  // ///////////////////
  // PUBLIC METHODS   //
  // ///////////////////

  create() {}
  fetchAndCreate() {} // same as findOneOrFetch
  fetch() {} // maybe? fetches again from the given SOURCE, defaults to transporter

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

  _finishLoading() {
    this.loaded = true;
    this._isLoaded.resolve();
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
