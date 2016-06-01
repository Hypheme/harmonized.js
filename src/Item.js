import { observable, autorun, computed } from 'mobx';
import uuid from 'uuid-v4';

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
    return { ...this.toTransporter, _id: this._id, _syncState: this._syncState };
  }

  @computed get toTransporter() {
    return { ...this.rawItem, id: this.id };
  }

  enableAutoSaveAndSave() {
    this.autoSave = true;
    return this._synchronize(2, 2);
  }

  save(values) {
    const autoSave = this.autoSave;
    this.autoSave = true; // we want this.set to call _synchronize
    const promise = this.set(values); // this task is async and we need this promise to be returned
    this.autoSave = autoSave; // we want autoSave reset asap, therefore in the sync part
    return promise; // now we return the promise
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

  get _storeState() {
    return this.__storeState;
  }
  get _syncState() {
    return this.__syncState;
  }
  set _syncState(state) {
    this.__syncState = state;
  }
  set _storeState(state) {
    this.__storeState = state;
  }

  _localStorageCreate() {
    return this._transaction(() => this._store.localStorage.create(this.toLocalStorage))
      .then(({ _id }) => {
        this._id = _id;
        this._storeState = 0;
      });
  }

  _localStorageSave() {
    return this._transaction(() => this._store.localStorage.save(this.toLocalStorage))
      .then(() => {
        this._storeState = 0;
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
    this._storeState = storeState;
    this._syncState = syncState;
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
    return routine().then(() => {
      if (this._transactionId !== currentTransaction) {
        throw new Error('unmatched transactionId');
      }
    });
  }

  _transporterCreate() {
    return this._transaction(() => this._store.transporter.create(this.toTransporter))
      .then(({ id }) => {
        this.id = id;
        this._syncState = 0;
        return this._transaction(() => this._store.localStorage.save(this.toLocalStorage));
      });
  }
  _transporterDelete() {
    this._store.remove(this);
    return this._transaction(() => this._store.transporter.delete(this.toTransporter))
      .then(() => {
        this._syncState = -1;
        return this._transaction(() => this._store.localStorage.delete(this.toLocalStorage));
      }).then(() => {
        this._storeState = -1;
        this._store.delete(this);
      });
  }
  _transporterSave() {
    return this._transaction(() => this._store.transporter.save(this.toTransporter))
      .then(() => {
        this._syncState = 0;
        return this._transaction(() => this._store.localStorage.save(this.toLocalStorage));
      });
  }

}
