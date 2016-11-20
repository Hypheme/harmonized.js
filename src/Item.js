import { observable, autorun, computed } from 'mobx';
import uuid from 'uuid-v4';
import { ACTION, STATE } from './constants';

export default class Item {

  constructor({ store, autoSave }) {
    this.autoSave = !(autoSave === false);
    this._store = store;
    let call = 0;
    this._dispose = autorun(() => this._stateHandler(call++));
    this._createRunTimeId();
  }
  construct(values = {}, { source }) {
    let p;
    switch (source) {
      case 'transporter':
        p = this._createFromTransporter(values);
        break;
      case 'clientStorage':
        p = this._createFromClientStorage(values);
        break;
      default:
        p = this._createFromState(values);
        break;
    }
    return p.catch(err => {
      this._syncState = STATE.LOCKED;
      this._storeState = STATE.LOCKED;
      this.removed = true; // we remove item from store
      throw err;
    });
  }

  // ///////////
  // statics //
  // ///////////
  @observable removed;
  @observable synced;
  @observable stored;

  // /////////////////////
  // INTERFACE METHODS //
  // /////////////////////

  // use this.constructor.keys
  static keys = undefined;

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  getClientStorageKey() {
    const promises = [];
    const result = {};
    this.constructor.keys.forEach(key => {
      if (key.primary === true) {
        if (key.store !== undefined) {
          promises.push(this[key.key].getClientStorageKey()
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

  // TODO rework. we don't wait for a transporter key to arrive. This is part of the transporter no
  getTransporterKey() {
    const promises = [];
    const result = {};
    for (let i = 0, len = this.constructor.keys.length; i < len; i++) {
      const key = this.constructor.keys[i];
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

  toClientStorage() {
    const result = {
      _syncState: this._syncState,
    };
    const promises = [];
    this.constructor.keys.forEach(key => {
      if (typeof key === 'string') {
        result[key] = this[key];
      } else {
        if (key.store !== undefined) {
          promises.push(this._waitForForeignKey(key, 'getClientStorageKey'));
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
            return this.toClientStorage();
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
    this.constructor.keys.forEach(key => {
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
    this.constructor.keys.forEach(key => {
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
  //   const keys = this.constructor.keys;
  //   const result = [];
  //   for (let i = 0, len = keys.length; i < len; i++) {
  //     const actKey = keys[i];
  //     if (typeof actKey === 'object') {
  //       actKey.key = actKey.key || actKey.store;
  //       actKey.transporterKey = actKey.transporterKey || `${actKey.key}Id`;
  //       actKey.clientStorageKey = `_${actKey.transporterKey}`;
  //       // TODO add onDelete/onChange methods
  //     }
  //     result.push(actKey);
  //   }
  //   this.constructor.keys = result;
  // }

  _createRunTimeId() {
    this.__id = uuid();
  }

  _createFromClientStorage(values) {
    this._syncState = values._syncState;
    this._storeState = this._syncState === STATE.BEING_DELETED ?
      STATE.REMOVED : STATE.EXISTENT;
    this.removed = (this._storeState === STATE.REMOVED);
    this.stored = true;
    this.synced = (this._syncState === STATE.EXISTENT);
    return this._setFromClientStorage(values)
      .then(() => this._synchronize(this._storeState, this._syncState));
  }

  _createFromState(values) {
    this.synced = false;
    this.stored = false;
    this.removed = false;
    this._syncState = STATE.BEING_CREATED;
    this._storeState = STATE.BEING_CREATED;
    return this._setFromState(values).
      then(() => this._synchronize(STATE.BEING_CREATED, STATE.BEING_CREATED));
  }

  _createFromTransporter(values) {
    this._syncState = STATE.EXISTENT;
    this._storeState = STATE.BEING_CREATED;
    this.removed = false;
    this.stored = false;
    this.synced = true;
    return this._setFromTransporter(values)
      .then(() => this._synchronize(this._storeState, this._syncState));
  }


  _onDeleteTrigger() {}

  _setFromState(values) {
    this.constructor.keys.forEach(key => {
      if (typeof key === 'string') {
        this[key] = values[key];
      } else if (key.store === undefined) {
        this._setPrimaryKey(values);
        // TODO: internal relations
      // } else if(typeof key.store === 'function') {
      //   this[key.name] = new key.store(values[key.name]);
      } else {
        this[key.name] = values[key.name];
      }
    });
    return Promise.resolve();
  }

  _setFromTransporter(values) {
    return this._setFromOutside(values, '');
  }

  _setFromClientStorage(values) {
    return this._setFromOutside(values, '_');
  }

  _setFromOutside(values, prefix = '') {
    const autoSave = this.autoSave;
    const promises = [];
    this.autoSave = false;
    this.constructor.keys.forEach(key => {
      if (typeof key === 'string') {
        this[key] = values[key];
      } else if (key.store === undefined) {
        this._setPrimaryKey(values);
      } else {
        const resolver = {};
        resolver[key[`${prefix}storeKey`]] = values[key[`${prefix}relationKey`]];
        // TODO add internal stores to the mix (hurray)
        promises.push(key.store.onceLoaded()
          .then(() => {
            const item = key.store.findOne(resolver);
            const asyncAutoSave = this.autoSave;
            this.autoSave = false;
            this[key.name] = item;
            this.autoSave = asyncAutoSave;
          }));
      }
    });
    this.autoSave = autoSave;
    return Promise.all(promises);
  }

  _getValidNewState(current, newState) {
    // TODO add fetch to the list
    switch (current) {
      case STATE.LOCKED:
        return newState === STATE.DELETED ? STATE.DELETED : STATE.LOCKED;
      case STATE.DELETED:
        return STATE.DELETED;
      case STATE.REMOVED:
        return newState === STATE.DELETED ? STATE.DELETED : STATE.REMOVED;
      case STATE.EXISTENT:
        return newState === STATE.BEING_UPDATED || newState === STATE.BEING_DELETED ?
          newState : current;
      case STATE.BEING_CREATED:
        return newState === STATE.EXISTENT ||
          newState === STATE.BEING_UPDATED ||
          newState === STATE.BEING_DELETED ?
          newState : current;
      case STATE.BEING_UPDATED:
        return newState === STATE.EXISTENT || newState === STATE.BEING_DELETED ?
          newState : current;
      case STATE.BEING_DELETED:
        switch (newState) {
          case STATE.DELETED:
            return STATE.DELETED;
          case STATE.REMOVED:
            return STATE.REMOVED;
          default:
            return STATE.LOCKED;
        }
      default:
        return current;
    }
  }

  _clientStorageCreate() {
    return this._transaction(() =>
      this.toClientStorage()
        .then(content => this._store.clientStorage.create(content))
        .then(response => this._setPrimaryKey(response)))
      .then(() => {
        this._setStoreState(STATE.EXISTENT);
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

  _clientStorageDelete() {
    return this._transaction(() => Promise.resolve())
    // TODO rework, we don't wait for ids anymore. This is job of the clientStorage
      .then(() => this.getClientStorageKey())
      .then(key => this._store.clientStorage.delete(key))
      .then(() => this._setStoreState(STATE.DELETED));
  }

  _clientStorageRemove() {
    return this._transaction(() => this.getClientStorageKey()
      .then(key => this._store.clientStorage.remove(key))
      .then(() => this._setStoreState(STATE.REMOVED)));
  }

  _clientStorageSave() {
    return this._transaction(() =>
      this.getClientStorageKey()
        .then(() => this.toClientStorage())
        .then(content => this._store.clientStorage.save(content)))
      .then(() => this._setStoreState(STATE.EXISTENT));
  }

  _setPrimaryKey(givenKeys) {
    for (let j = 0, lenj = this.constructor.keys.length; j < lenj; j++) {
      const key = this.constructor.keys[j];
      if (key.primary === true && key.store === undefined) {
        this[key.key] = this[key.key] || givenKeys[key.key];
        this[key._key] = this[key._key] || givenKeys[key._key];
      }
    }
  }

  _setStoreState(state) {
    this._storeState = this._getValidNewState(this._storeState, state);
    if (this._storeState === STATE.EXISTENT || this._storeState === STATE.DELTED) {
      this.stored = true;
    } else {
      this.stored = false;
    }
  }

  _setSyncState(state) {
    this._syncState = this._getValidNewState(this._syncState, state);
    if (this._syncState === STATE.EXISTENT || this._syncState === STATE.DELETED) {
      this.synced = true;
    } else {
      this.synced = false;
    }
  }

  _stateHandler(call) {
    if (this.autoSave && call !== 0) {
      this._synchronize(STATE.BEING_UPDATED, STATE.BEING_UPDATED);
    }
    return this._stateHandlerTrigger(); // we need this for mobx, and we return it because
    // there is nothing else to do with the data
  }

  _stateHandlerTrigger() {
    this.constructor.keys.forEach(key => {
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
    this.lastSynchronize = this._synchronizeClientStorage()
      .then(() => this._synchronizeTransporter());
    return this.lastSynchronize;
  }

  _synchronizeClientStorage() {
    switch (this._storeState) {
      case STATE.BEING_CREATED: return this._clientStorageCreate();
      case STATE.BEING_UPDATED: return this._clientStorageSave();
      case STATE.BEING_DELETED: return this._clientStorageRemove();
      default:
        return new Promise(resolve => resolve());
    }
  }

  _synchronizeTransporter() {
    switch (this._syncState) {
      case STATE.BEING_CREATED: return this._transporterCreate();
      case STATE.BEING_UPDATED: return this._transporterSave();
      case STATE.BEING_DELETED: return this._transporterDelete();
      default:
        return new Promise(resolve => resolve());
    }
  }

  _transaction(routine) {
    // TODO: rework: we don't block unmatched transactions anymore
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
        this._setSyncState(STATE.EXISTENT);
        return this._clientStorageSave();
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
      .then(() => this._setSyncState(STATE.DELETED))
      .then(() => this._clientStorageDelete());
  }

  _transporterSave() {
    return this._transaction(() =>
      this.getTransporterKey()
        .then(() => this.toTransporter())
        .then(content => this._store.transporter.save(content)))
      .then(() => this._setSyncState(STATE.EXISTENT))
      .then(() => this._clientStorageSave());
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
