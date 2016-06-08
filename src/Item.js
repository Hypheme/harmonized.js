import { observable, autorun, computed } from 'mobx';
import uuid from 'uuid-v4';

export default class Item {
  autoSave = true;
  @observable synced;
  @observable stored;

  constructor(store, values = {}) {
    this._store = store;
    this._autocompleteKeys();
    this._storeState = 0;
    this._setStoreState(values._id === undefined ? 1 : 0);
    values._syncState = values._syncState === undefined ? 1 : values._syncState;
    if (values._syncState === -2) {
      values._syncState = 3;
    }
    this._syncState = 0;
    this._setSyncState(values._syncState);
    // TODO change this to this.fromLocalStorage (if _id set)
    // else this.fromTransporter()
    this._set(values, [...this.keys, 'id', '_id']);
    let call = 0;
    this.dispose = autorun(() => this._stateHandler(call++));
  }

  // /////////////////////
  // INTERFACE METHODS //
  // /////////////////////

  /**
   * returns all keys of the raw item data
   *  excluding id, _id and _synstatus
   *
   * example:
   *  return ['title', 'content', 'relationId'];
   *
   * @return {array} item keys
   */
  get keys() {
    throw new Error('ITEM_IMPLEMENTATION_ERROR: get keys is not implemented');
  }

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  enableAutoSaveAndSave() {
    this.autoSave = true;
    return this._synchronize(2, 2);
  }

  fetch() {
    return this._store.transporter.fetch(this.toTransporter)
      .then((fetchedData) => {
        const autoSave = this.autoSave;
        this.autoSave = false;
        this.fromTransporter(fetchedData);
        const promise = this._synchronize(2, 0);
        this.autoSave = autoSave;
        return promise;
      });
  }

  remove() {
    const autoSave = this.autoSave;
    this.autoSave = false;
    this._onDeleteTrigger();
    const promise = this._synchronize(2, 3);
    this.autoSave = autoSave;
    return promise;
  }

  save(values) {
    const autoSave = this.autoSave;
    this.autoSave = true;
    const promise = this.set(values);
    this.autoSave = autoSave;
    return promise;
  }

  saveLocal(values) {
    const autoSave = this.autoSave;
    const promise = this.set(values)
      .then(() => this._synchronize(2, 0));
    this.autoSave = autoSave;
    return promise;
  }

  set(values) {
    const autoSave = this.autoSave;
    this.autoSave = false;
    this._set(values, this.keys);
    this.autoSave = autoSave;
    if (this.autoSave) {
      return this._synchronize(2, 2);
    }
    return new Promise((resolve) => resolve());
  }

  toLocalStorage() {
    const result = {
      id: this.id,
      _id: this._id,
      _syncState: this._syncState,
    };
    const promises = [];
    for (let i = 0, len = this._keys.length; i < len; i++) {
      const actKey = this._keys[i];
      if (typeof actKey === 'string') {
        result[actKey] = this[actKey];
      } else {
        if (this[actKey.key] && this[actKey.key]._id === undefined) {
          promises.push(new Promise((resolve) => {
            const relationItem = this[actKey.key];
            const dispose = autorun(() => {
              if (relationItem.stored) {
                dispose();
                result[actKey.transporterKey] = relationItem.id;
                result[actKey.localStorageKey] = relationItem._id;
                resolve();
              }
            });
          }));
        } else {
          result[actKey.transporterKey] = this[actKey.key] && this[actKey.key].id;
          result[actKey.localStorageKey] = this[actKey.key] && this[actKey.key]._id;
        }
      }
    }
    return Promise.all(promises).then(() => result);
  }

  toRawItem(ignoreRelations = false) {
    const result = {};
    if (!ignoreRelations) {
      result.id = this.id;
    }
    const promises = [];
    for (let i = 0, len = this._keys.length; i < len; i++) {
      const actKey = this._keys[i];
      if (typeof actKey === 'string') {
        result[actKey] = this[actKey];
      } else {
        if (!ignoreRelations && this[actKey.key]) {
          const relationItem = this[actKey.key];
          promises.push(relationItem.toRawItem(ignoreRelations)
            .then(rawRelation => {
              result[actKey.key] = rawRelation;
            }));
        }
      }
    }
    return Promise.all(promises).then(() => result);
  }

  toTransporter() {
    const result = {
      id: this.id,
    };
    const promises = [];
    for (let i = 0, len = this._keys.length; i < len; i++) {
      const actKey = this._keys[i];
      if (typeof actKey === 'string') {
        result[actKey] = this[actKey];
      } else {
        if (this[actKey.key] && this[actKey.key].id === undefined) {
          promises.push(new Promise((resolve) => {
            const relationItem = this[actKey.key];
            const dispose = autorun(() => {
              if (relationItem.synced) {
                dispose();
                result[actKey.transporterKey] = relationItem.id;
                resolve();
              }
            });
          }));
        } else {
          result[actKey.transporterKey] = this[actKey.key] && this[actKey.key].id;
        }
      }
    }
    return Promise.all(promises).then(() => result);
  }

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _autocompleteKeys() {
    const keys = this.keys;
    const result = [];
    for (let i = 0, len = keys.length; i < len; i++) {
      const actKey = keys[i];
      if (typeof actKey === 'object') {
        actKey.key = actKey.key || actKey.store;
        actKey.transporterKey = actKey.transporterKey || `${actKey.key}Id`;
        actKey.localStorageKey = `_${actKey.transporterKey}`;
        // TODO add onDelete/onChange methods
      }
      result.push(actKey);
    }
    this._keys = result;
  }

  _onDeleteTrigger() {}

  // TODO fromRawItem
  fromRawItem(item) {
    const rawItem = item;
    return rawItem;
  }
  // TODO fromTransporter
  fromTransporter(item) {
    const transporterItem = item;
    return transporterItem;
  }
  // TODO fromLocalStorage

  _localStorageCreate() {
    return this._transaction(() => this._store.localStorage.create(this.toLocalStorage))
      .then(({ _id }) => {
        this._id = _id;
        this._setStoreState(0);
      });
  }

  _localStorageSave() {
    return this._transaction(() => this._store.localStorage.save(this.toLocalStorage))
      .then(() => {
        this._setStoreState(0);
      });
  }

  _set(values = {}, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (values[key] !== undefined) {
        this[key] = values[key];
      }
    }
  }

  _setStoreState(state) {
    if (this._storeState !== -1) {
      this._storeState = state;
    }
    this.stored = this._storeState === 0;
  }

  _setSyncState(state) {
    switch (state) {
      case -1:
        this._syncState = -1;
        break;
      case 0:
      case 1:
      case 2:
      case 3:
        if (this._syncState !== -2 && this._syncState !== -1 && this._syncState !== 3) {
          this._syncState = state;
        } else if (this._syncState === 3 && state === 3) {
          this._syncState = -2;
        }
        break;
      default:
    }
    this.synced = this._syncState === 0;
  }

  _stateHandler(call) {
    if (call === 0) {
      this._synchronize(this._storeState, this._syncState);
    } else if (this.autoSave) {
      this._synchronize(2, 2);
    }
    return this.rawItem; // we need this for mobx, and we return it because
    // there is nothing else to do with the data
  }

  _synchronize(storeState, syncState) {
    this._setStoreState(storeState);
    this._setSyncState(syncState);
    this.lastSynchronize = this._synchronizeLocalStorage()
      .then(() => this._synchronizeTransporter());
    return this.lastSynchronize;
  }

  _synchronizeLocalStorage() {
    switch (this._storeState) {
      case 1: return this._localStorageCreate();
      case 2: return this._localStorageSave();
      default:
        return new Promise(resolve => resolve());
    }
  }

  _synchronizeTransporter() {
    switch (this._syncState) {
      case 1: return this._transporterCreate();
      case 2: return this._transporterSave();
      case 3: return this._transporterDelete();
      default:
        return new Promise(resolve => resolve());
    }
  }

  _transaction(routine) {
    this._transactionId = uuid();
    const currentTransaction = this._transactionId;
    return routine().then((response) => {
      if (this._transactionId !== currentTransaction) {
        throw new Error('unmatched transactionId');
      }
      return response;
    });
  }

  _transporterCreate() {
    return this._transaction(() => this._store.transporter.create(this.toTransporter))
      .then(({ id }) => {
        this.id = id;
        this._setSyncState(0);
        return this._transaction(() => this._store.localStorage.save(this.toLocalStorage));
      });
  }

  _transporterDelete() {
    this._store.remove(this);
    return this._transaction(() => this._store.transporter.delete(this.toTransporter))
      .then(() => {
        this._setSyncState(-1);
        return this._transaction(() => this._store.localStorage.delete(this.toLocalStorage));
      }).then(() => {
        this._setStoreState(-1);
        this._store.delete(this);
      });
  }

  _transporterSave() {
    return this._transaction(() => this._store.transporter.save(this.toTransporter))
      .then(() => {
        this._setSyncState(0);
        return this._transaction(() => this._store.localStorage.save(this.toLocalStorage));
      });
  }

}
