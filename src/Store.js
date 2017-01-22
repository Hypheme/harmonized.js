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
    options = { autosave: true },
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
      this._deleteItems(tData.toDelete, SOURCE.TRANSPORTER);
    })
    .then(() => this._finishLoading());
  }

  // ///////////////////
  // PUBLIC METHODS   //
  // ///////////////////

  create() {}
  fetchAndCreate() {} // same as findOneOrFetch
  fetch() {} // maybe? fetches again from the given SOURCE, defaults to transporter

  find() {} // returns array of items
  findOne() {} // returns item or undefined
  findOneOrFetch() {} // returns promise which resolves in harmonized promise

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

  _castItemTransporterState(/* rawState*/) {
    // TODO get transporterState out of string
  }

  _createItems(rawItems, source) {
    return Promise.all(rawItems.map((rawItem) => {
      const item = new this._Item({ store: this, autoSave: this.options.autoSave });
      if (rawItem._transporterState !== STATE.BEING_DELETED &&
        rawItem._transporterState !== STATE.REMOVED &&
        rawItem._transporterState !== STATE.LOCKED) {
        this.items.push(item);
      }
      return item.construct(rawItem, { source });
    }));
  }

  _deleteItems(/* items, source*/) {
    // TODO deletedItems
  }

  _finishLoading() {
    this.loaded = true;
    this._isLoaded.resolve();
  }

  _removeItems(itemKeys, source) {
    const identifier = this.schema.getKeyIdentiferFor(source.AS_TARGET);
    return Promise.all(itemKeys.map(itemKey =>
      this.findOne({ [identifier]: itemKey[identifier] }).remove(source)));
  }

}
