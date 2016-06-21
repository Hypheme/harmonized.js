import { observable, autorun, computed } from 'mobx';
import uuid from 'uuid-v4';

export default class Item {
  autoSave = true;
  @observable synced;
  @observable stored;
  @observable id;
  @observable _id;

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
      } else if (this[actKey.key] && this[actKey.key]._id === undefined) {
        promises.push(new Promise((resolve) => {
          const relationItem = this[actKey.key];
          const dispose = autorun(() => {
            if (relationItem.stored) {
              dispose();
              resolve();
            }
          });
        }));
      } else {
        result[actKey.transporterKey] = this[actKey.key] && this[actKey.key].id;
        result[actKey.localStorageKey] = this[actKey.key] && this[actKey.key]._id;
      }
    }
    if (promises.length !== 0) {
      // we call recursive on pupose if anything async happens. This way we make sure,
      // the final result contains the actual content and not the content it had on the
      // first run(before the async part)
      return Promise.all(promises).then(() => this.toLocalStorage());
    }
    return new Promise(resolve => resolve(result));
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
      } else if (this[actKey.key] && this[actKey.key].id === undefined) {
        promises.push(new Promise((resolve) => {
          const relationItem = this[actKey.key];
          const dispose = autorun(() => {
            if (relationItem.synced) {
              dispose();
              resolve();
            }
          });
        }));
      } else {
        result[actKey.transporterKey] = this[actKey.key] && this[actKey.key].id;
      }
    }
    if (promises.length !== 0) {
      // same reason as in toLocalStorage
      return Promise.all(promises).then(() => this.toTransporter());
    }
    return new Promise(resolve => resolve(result));
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
  }
  // TODO fromTransporter
  fromTransporter(item) {
    this.id = item.id;
  }
  // TODO fromLocalStorage
  fromLocalStorage(values) {
    this.id = values.id;
    this._id = values._id;
  }

  _localStorageCreate() {
    return this._transaction(() =>
      this.toLocalStorage()
        .then(content => this._store.localStorage.create(content))
        .then(response => {
          this._setPrimaryKey(response);
        }))
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
      .catch(() => undefined) // we ignore thransaction, we just need to make a new one
      .then(() => this._waitFor('_id'))
      .then(() => this._store.localStorage.delete({ _id: this._id }))
      .then(() => this._setStoreState(-1)); // TODO move this to _localStorageRemove
  }

  _localStorageRemove() {
    return this._transaction(() =>
      this._waitFor('_id').then(() =>
      this._store.localStorage.remove({ _id: this._id })));
  }

  _localStorageSave() {
    return this._transaction(() =>
      this._waitFor('_id')
        .then(() => this.toLocalStorage())
        .then(content => this._store.localStorage.save(content)))
      .then(() => this._setStoreState(0));
  }

  _setPrimaryKey() {}

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
    return this.toRawItem(true); // we need this for mobx, and we return it because
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
        .then(({ id }) => {
          this.id = id;
        }))
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
      .catch(() => undefined) // we ignore thransaction, we just need to make a new one
      .then(() => this._waitFor('id'))
      .then(() => this._store.transporter.delete({ id: this.id }))
      .then(() => this._setSyncState(-1))
      .then(() => this._localStorageDelete());
  }

  _transporterSave() {
    return this._transaction(() =>
      this._waitFor('id')
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

}
