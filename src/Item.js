import { observable, autorun/* , computed*/ } from 'mobx';
import uuid from 'uuid-v4';
import { /* ACTION,*/ STATE, SOURCE } from './constants';

export default class Item {

  constructor({ store, autoSave }) {
    this.autoSave = !(autoSave === false);
    this._store = store;
    this._createRunTimeId();
  }
  construct(values = {}, { source }) {
    let p;
    switch (source) {
      case SOURCE.TRANSPORTER:
        p = this._createFromTransporter(values);
        break;
      case SOURCE.CLIENT_STORAGE:
        p = this._createFromClientStorage(values);
        break;
      default:
        p = this._createFromState(values);
        break;
    }
    let call = 0;
    return p.then(() => {
      let finishConstruct;
      this._dispose = autorun(() => {
        finishConstruct = this._stateHandler(call++);
      });
      return finishConstruct;
    }).catch(err => {
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

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _createRunTimeId() {
    this.__id = uuid();
  }

  _createFromClientStorage(values) {
    this._syncState = values._syncState || STATE.BEING_CREATED;
    this._storeState = this._syncState === STATE.BEING_DELETED ?
      STATE.REMOVED : STATE.EXISTENT;
    this.removed = (this._storeState === STATE.REMOVED);
    this.stored = true;
    this.synced = (this._syncState === STATE.EXISTENT);
    this._store.schema.setPrimaryKey(this, values);
    return this._store.schema.setFromClientStorage(this, values, { establishObservables: true });
  }

  _createFromState(values) {
    this.synced = false;
    this.stored = false;
    this.removed = false;
    this._syncState = STATE.BEING_CREATED;
    this._storeState = STATE.BEING_CREATED;
    // no need for keys as its from the state and therefore has no keys yet
    return this._store.schema
      .setFromState(this, values, { establishObservables: true });
  }

  _createFromTransporter(values) {
    this._syncState = STATE.EXISTENT;
    this._storeState = STATE.BEING_CREATED;
    this.removed = false;
    this.stored = false;
    this.synced = true;
    this._store.schema.setPrimaryKey(this, values);
    return this._store.schema.setFromTransporter(this, values, { establishObservables: true });
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
    this._store.schema.getObservables(this); // we need this for mobx
    if (call === 0) {
      return this._synchronize(this._storeState, this._syncState);
    }
    if (this.autoSave) {
      this._setStoreState(STATE.BEING_UPDATED);
      this._setSyncState(STATE.BEING_UPDATED);
      return this._synchronize(this._storeState, this._syncState);
    }
    return Promise.resolve();
  }


  _synchronize(/* storeState, syncState*/) {}

}
