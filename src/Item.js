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
      // TODO not sure about this yet as _synchronize might not be able to return a promise
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

  _getNextActionState(current, next, newState) {
    // first we determine if the newState is allowed based on the current one
    let allowedNewStates;
    switch (current) {
      case STATE.BEING_CREATED:
        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED, STATE.BEING_FETCHED];
        break;
      case STATE.BEING_UPDATED:
        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED, STATE.BEING_FETCHED];
        break;
      case STATE.BEING_DELETED: // after deleting there is no change possible anymore
        return undefined;
      case STATE.BEING_FETCHED:
        // after fetching the item is alwas been created and has the most recent data
        // only deleting an item right after a fetch makes sense
        allowedNewStates = [STATE.BEING_DELETED];
        break;
      // case STATE.BEING_REMOVED: // TODO not sure if even needed
      case STATE.EXISTENT:
        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED, STATE.BEING_FETCHED];
        break;
      case STATE.LOCKED: // TODO not sure yet, we might can un-LOCK in the future
        return undefined;
      case STATE.DELETED: // pretty much the same as BEING_DELETED.
        return undefined;
      // case STATE.REMOVED: // TODO once again not sure if needed anymore
      default: // we don't change anything
        return next;
    }
    if (allowedNewStates.reduce((isAllowed, allowedNewState) =>
      isAllowed || (allowedNewState === newState), false) === false) {
        // if the new state is not in the allowed we don't change the next state
      return next;
    }
    return this._mergeNextState(next, newState);
  }

  _mergeNextState(next, newState) {
    switch (next) {
      case undefined:
        return newState;
      case STATE.BEING_CREATED:
        if (newState === STATE.BEING_DELETED) {
          return undefined;
        }
        return STATE.BEING_CREATED;
      case STATE.BEING_UPDATED:
        switch (newState) {
          case STATE.BEING_DELETED:
            return STATE.BEING_DELETED;
          case STATE.BEING_FETCHED:
            return STATE.BEING_FETCHED;
          default:
            return STATE.BEING_UPDATED;
        }
      case STATE.BEING_DELETED:
      // once deleted there is no return
        return STATE.BEING_DELETED;
      case STATE.BEING_FETCHED:
      // for now we overwrite fetches if there are changes before the fetch takes place
      // to be discussed though.
        switch (newState) {
          case STATE.BEING_DELETED:
            return STATE.BEING_DELETED;
          case STATE.BEING_UPDATED:
            return STATE.BEING_UPDATED;
          default:
            return STATE.BEING_FETCHED;
        }
      default:
        return undefined;
    }
  }

  // TODO get _syncState we will compute _syncState out of _transporterStates

  _setNextStoreState(state) {
    this._storeStates.next = this._getNextState(
      this._storeStates.inProgress || this._storeStates.current,
      this._storeStates.next,
      state);
  }
  _setNextTransporterState(state) {
    this._transporterStates.next = this._getNextState(
      this._transporterStates.inProgress || this._transporterStates.current,
      this._transporterStates.next,
      state);
  }

  _stateHandler(call) {
    this._store.schema.getObservables(this); // we need this for mobx
    if (call === 0) {
      return this._synchronize(this._storeState, this._syncState);
    }
    if (this.autoSave) {
      return this._synchronize(STATE.BEING_UPDATED, STATE.BEING_UPDATED);
    }
    return Promise.resolve();
  }

  _synchronize(storeState, syncState) {
    this._setNextStoreState(storeState);
    this._setNextTransporterState(syncState);
    return Promise.all(
      this._triggerClientStorageSync(),
      this._triggerTransporterSync());
  }

}
