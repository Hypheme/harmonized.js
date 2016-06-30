import { observable, autorun, computed } from 'mobx';
import uuid from 'uuid-v4';

export default class Item {
  autoSave = true;
  @observable synced;
  @observable stored;
  // TODO move this into autocompleteKeys or constuctor
  @observable id;
  @observable _id;

  constructor(store, values = {}) {
    this._store = store;
    this._storeState = 0;
    this._setStoreState(values._id === undefined ? 1 : 0);
    values._syncState = values._syncState === undefined ? 1 : values._syncState;
    if (values._syncState === -2) {
      values._syncState = 3;
    }
    this._syncState = 0;
    this._setSyncState(values._syncState);
    if (values._id) {
      this.fromLocalStorage(values);
    } else if (values.id) {
      this.fromTransporter(values);
    } else {
      this.fromRawItem(values, false);
    }
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

  getLocalStorageKey() {
    const promises = [];
    const result = {};
    this.keys.forEach(key => {
      if (key.primary === true) {
        if (key.store !== undefined) {
          promises.push(this[key.key].getLocalStorageKey()
            .then(returnedKey => {
              result[key._relationKey] = returnedKey[key._storeKey];
            }));
        } else {
          promises.push(this._waitFor(key._relationKey)
            .then(() => {
              result[key._relationKey] = this[key._relationKey];
            }));
        }
      }
    });
    return Promise.all(promises)
      .then(() => result);
  }

  getTransporterKey() {
    const promises = [];
    const result = {};
    for (let i = 0, len = this.keys.length; i < len; i++) {
      const key = this.keys[i];
      if (key.primary === true) {
        if (key.store !== undefined) {
          promises.push(this[key.key].getTransporterKey()
            .then(returnedKey => {
              result[key.relationKey] = returnedKey[key.storeKey];
            }));
        } else {
          promises.push(this._waitFor(key.relationKey)
            .then(() => {
              result[key.relationKey] = this[key.relationKey];
            }));
        }
      }
    }
    return Promise.all(promises)
      .then(() => result);
  }

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

  // TODO fromRawItem
  fromRawItem(item) {
  }

  fromTransporter(values) {
    const autoSave = this.autoSave;
    const promises = [];
    this.autoSave = false;
    this.keys.forEach(key => {
      if (typeof key === 'string') {
        this[key] = values[key];
      } else if (key.store === undefined) {
        this._setPrimaryKey(values);
      } else {
        const resolver = {};
        resolver[key.storeKey] = values[key.relationKey];
        promises.push(this._store.stores[key.store].resolveAsync(resolver)
          .then(item => {
            const asyncAutoSave = this.autoSave;
            this.autoSave = false;
            this[key.key] = item;
            this.autoSave = asyncAutoSave;
          }));
      }
    });
    this.autoSave = autoSave;
    return Promise.all(promises)
      .then(() => this._synchronize(2, 0));
  }

  // TODO fromLocalStorage
  fromLocalStorage(values) {
    this.id = values.id;
    this._id = values._id;
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
      _syncState: this._syncState,
    };
    const promises = [];
    this.keys.forEach(key => {
      if (typeof key === 'string') {
        result[key] = this[key];
      } else {
        if (key.store !== undefined) {
          promises.push(this._waitForForeignKey(key, 'getLocalStorageKey'));
        } else {
          result[key._relationKey] = this[key._relationKey];
          result[key.relationKey] = this[key.relationKey];
        }
      }
    });
    return Promise.all(promises)
      .then(contexts => {
        for (let i = 0, len = contexts.length; i < len; i++) {
          const item = contexts[i].item;
          const key = contexts[i].key;
          if (item !== this[key.key]) { // something has changed in the meantime
            return this.toLocalStorage();
          }
          result[key._relationKey] = this[key.key][key._storeKey];
          result[key.relationKey] = this[key.key][key.storeKey];
        }
        return result;
      });
  }

  toRawItem(ignoreRelations = false) {
    const result = {};
    const promises = [];
    this.keys.forEach(key => {
      if (typeof key === 'string') {
        result[key] = this[key];
      } else {
        if (!ignoreRelations) {
          if (key.store !== undefined) {
            promises.push(this[key.key].toRawItem()
              .then(item => {
                result[key.key] = item;
              }));
          } else {
            result[key.relationKey] = this[key.relationKey];
            result[key._relationKey] = this[key._relationKey];
          }
        }
      }
    });
    return Promise.all(promises).then(() => result);
  }

  toTransporter() {
    const result = { };
    const promises = [];
    this.keys.forEach(key => {
      if (typeof key === 'string') {
        result[key] = this[key];
      } else {
        if (key.store !== undefined) {
          promises.push(this._waitForForeignKey(key, 'getTransporterKey'));
        } else {
          result[key.relationKey] = this[key.relationKey];
        }
      }
    });
    return Promise.all(promises)
      .then(contexts => {
        for (let i = 0, len = contexts.length; i < len; i++) {
          const item = contexts[i].item;
          const key = contexts[i].key;
          if (item !== this[key.key]) { // something has changed in the meantime
            return this.toTransporter();
          }
          result[key.relationKey] = this[key.key][key.storeKey];
        }
        return result;
      });
  }

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  // _autocompleteKeys() {
  //   const keys = this.keys;
  //   const result = [];
  //   for (let i = 0, len = keys.length; i < len; i++) {
  //     const actKey = keys[i];
  //     if (typeof actKey === 'object') {
  //       actKey.key = actKey.key || actKey.store;
  //       actKey.transporterKey = actKey.transporterKey || `${actKey.key}Id`;
  //       actKey.localStorageKey = `_${actKey.transporterKey}`;
  //       // TODO add onDelete/onChange methods
  //     }
  //     result.push(actKey);
  //   }
  //   this.keys = result;
  // }

  _onDeleteTrigger() {}

  _getValidNewState(current, newState) {
    switch (current) {
      case -2:
        return newState === -1 ? -1 : current;
      case -1:
        return -1;
      case 0:
        return newState === 2 || newState === 3 ? newState : current;
      case 1:
        return newState === 0 || newState === 2 || newState === 3 ? newState : current;
      case 2:
        return newState === 0 || newState === 3 ? newState : current;
      case 3:
        return newState === -1 ? -1 : -2;
      default:
        return current;
    }
  }

  _localStorageCreate() {
    return this._transaction(() =>
      this.toLocalStorage()
        .then(content => this._store.localStorage.create(content))
        .then(response => this._setPrimaryKey(response)))
      .then(() => {
        this._setStoreState(0);
      })
      .catch(err => {
        // we fullfil even if there is a later transaction because we always want
        // an item to be created (otherwise it couldn't be manipulated)
        if (err && err.message === 'unmatched transactionId') {
          return;
        }
        throw err;
      });
  }

  _localStorageDelete() {
    return this._transaction(() => Promise.resolve())
      .then(() => this.getLocalStorageKey())
      .then(key => this._store.localStorage.delete(key))
      .then(() => this._setStoreState(-1));
  }

  _localStorageRemove() {
    return this._transaction(() => this.getLocalStorageKey()
      .then(key => this._store.localStorage.remove(key))
      .then(() => this._setStoreState(-1)));
  }

  _localStorageSave() {
    return this._transaction(() =>
      this.getLocalStorageKey()
        .then(() => this.toLocalStorage())
        .then(content => this._store.localStorage.save(content)))
      .then(() => this._setStoreState(0));
  }

  _setPrimaryKey(givenKeys) {
    for (let j = 0, lenj = this.keys.length; j < lenj; j++) {
      const key = this.keys[j];
      if (key.primary === true && key.store === undefined) {
        this[key.relationKey] = this[key.relationKey] || givenKeys[key.relationKey];
        this[key._relationKey] = this[key._relationKey] || givenKeys[key._relationKey];
      }
    }
  }

  _setStoreState(state) {
    this._storeState = this._getValidNewState(this._storeState, state);
    if (this._storeState === 0 || this._storeState === -1) {
      this.stored = true;
    } else {
      this.stored = false;
    }
  }

  _setSyncState(state) {
    this._syncState = this._getValidNewState(this._syncState, state);
    if (this._syncState === 0 || this._syncState === -1) {
      this.synced = true;
    } else {
      this.synced = false;
    }
  }

  _stateHandler(call) {
    if (call === 0) {
      this._synchronize();
    } else if (this.autoSave) {
      this._synchronize(2, 2);
    }
    return this._stateHandlerTrigger(); // we need this for mobx, and we return it because
    // there is nothing else to do with the data
  }

  _stateHandlerTrigger() {
    this.keys.forEach(key => {
      let result;
      if (typeof key === 'string') {
        result = this[key];
      } else if (key.store !== undefined) {
        result = this[key.key];
      }
      return result;
    });
  }

  _synchronize(storeState, syncState) {
    if (storeState !== undefined) {
      this._setStoreState(storeState);
    }
    if (syncState !== undefined) {
      this._setSyncState(syncState);
    }
    this.lastSynchronize = this._synchronizeLocalStorage()
      .then(() => this._synchronizeTransporter());
    return this.lastSynchronize;
  }

  _synchronizeLocalStorage() {
    switch (this._storeState) {
      case 1: return this._localStorageCreate();
      case 2: return this._localStorageSave();
      case 3: return this._localStorageRemove();
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
    return this._transaction(() =>
      this.toTransporter()
        .then(content => this._store.transporter.create(content))
        .then(key => this._setPrimaryKey(key)))
      .then(() => {
        this._setSyncState(0);
        return this._localStorageSave();
      })
      .catch(err => {
        // we fullfil even if there is a later transaction because we always want
        // an item to be created (otherwise it couldn't be manipulated)
        if (err && err.message === 'unmatched transactionId') {
          return;
        }
        throw err;
      });
  }

  _transporterDelete() {
    return this._transaction(() => Promise.resolve())
      .then(() => this.getTransporterKey())
      .then(key => this._store.transporter.delete(key))
      .then(() => this._setSyncState(-1))
      .then(() => this._localStorageDelete());
  }

  _transporterSave() {
    return this._transaction(() =>
      this.getTransporterKey()
        .then(() => this.toTransporter())
        .then(content => this._store.transporter.save(content)))
      .then(() => this._setSyncState(0))
      .then(() => this._localStorageSave());
  }

  _waitFor(key) {
    if (this[key] === undefined) {
      return new Promise(resolve => {
        const dispose = autorun(() => {
          if (this[key] !== undefined) {
            dispose();
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  }

  _waitForForeignKey(key, getter) {
    const context = {
      item: this[key.key],
      key,
    };
    return this[key.key][getter]()
      .then(() => context);
  }

}
