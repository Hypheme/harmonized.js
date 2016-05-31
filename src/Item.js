import { observable, autorun, computed } from 'mobx';

export default class Item {
  autoSave = true;
  synced;
  stored;

  constructor(store, values = {}) {
    this._store = store;
    this._storeState = values._id === undefined ? 1 : 0;
    values._syncState = values._syncState === undefined ? 1 : values._syncState;
    if (values._syncState === -2) {
      values._syncState = 3;
    }
    this._set(values, [...this.rawItemKeys, 'id', '_id', '_syncState']);
    let call = 0;
    this.dispose = autorun(() => this._stateHandler(call++));
  }

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  @computed get rawItem() {
    const result = {};
    for (let i = 0; i < this.rawItemKeys.length; i++) {
      result[this.rawItemKeys[i]] = this[this.rawItemKeys[i]];
    }
    return result;
  }

  @computed get toLocalStorage() {
    const result = this.toTransporter;
    result._id = this._id;
    result._syncState = this._syncState;
    return result;
  }

  @computed get toTransporter() {
    const result = this.rawItem;
    result.id = this.id;
    return result;
  }

  enableAutoSaveAndSave() {
    this.autoSave = true;
    return this._synchronize(2, 2);
  }

  set(values) {
    const autoSave = this.autoSave;
    this.autoSave = false;
    this._set(values, this.rawItemKeys);
    this.autoSave = autoSave;
    if (this.autoSave) {
      return this._synchronize(2, 2);
    }
    return new Promise((resolve) => resolve());
  }

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _set(values, keys) {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (values[key] !== undefined) {
        this[key] = values[key];
      }
    }
  }

  _stateHandler(call) {
  }
  _synchronize() {}
}
