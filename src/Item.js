import { observable, autorun, computed } from 'mobx';

export default class Item {
  constructor(store, values = { _syncState: 1 }) {
    this._store = store;
    if (values._id !== undefined) {
      this._storeState = 0;
    } else {
      this._storeState = 1;
    }
    if (values._syncState === -2) {
      values._syncState = 3;
    }
    const keys = this.rawItemKeys;
    keys.push('id', '_id', '_syncState');
    this._set(values, keys);
    this.dispose = autorun(() => this._stateHandler());
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

  _stateHandler() {}
  _synchronize() {}
}
