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
      this._dispose = autorun(() => {
        this._stateHandler(call++);
      });
    }).catch(err => {
      this._transporterState = STATE.LOCKED;
      this._clientStorageState = STATE.LOCKED;
      this.removed = true; // TODO we remove item from store
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
    this._transporterState = values._transporterState || STATE.BEING_CREATED;
    this._clientStorageState = this._transporterState === STATE.BEING_DELETED ?
      STATE.REMOVED : STATE.EXISTENT;
    this.removed = (this._clientStorageState === STATE.REMOVED);
    this.stored = true;
    this.synced = (this._transporterState === STATE.EXISTENT);
    this._store.schema.setPrimaryKey(this, values);
    return this._store.schema.setFromClientStorage(this, values, { establishObservables: true });
  }

  _createFromState(values) {
    this.synced = false;
    this.stored = false;
    this.removed = false;
    this._transporterState = STATE.BEING_CREATED;
    this._clientStorageState = STATE.BEING_CREATED;
    // no need for keys as its from the state and therefore has no keys yet
    return this._store.schema
      .setFromState(this, values, { establishObservables: true });
  }

  _createFromTransporter(values) {
    this._transporterState = STATE.EXISTENT;
    this._clientStorageState = STATE.BEING_CREATED;
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

  // TODO get _transporterState we will compute _transporterState out of _transporterStates

  _setNextStoreState(state) {
    this._clientStorageStates.next = this._getNextState(
      this._clientStorageStates.inProgress || this._clientStorageStates.current,
      this._clientStorageStates.next,
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
      return this._synchronize(this._clientStorageState, this._transporterState);
    }
    if (this.autoSave) {
      return this._synchronize(STATE.BEING_UPDATED, STATE.BEING_UPDATED);
    }
    return Promise.resolve();
  }

  _synchronize(clientStorageState, transporterState) {
    // first determine if a sync process is already happening
    const clientStorageSyncInProgress = this._clientStorageStates.inProgress
      || this._clientStorageStates.next;
    const transporterSyncInProgress = this._transporterStates.inProgress
      || this._transporterStates.next;
    // merge the new state with the exiting ones
    this._setNextStoreState(clientStorageState);
    this._setNextTransporterState(transporterState);
    // trigger sync processes if it's not already happening
    if (!clientStorageSyncInProgress) {
      this._triggerClientStorageSync();
    }
    if (!transporterSyncInProgress) {
      this._triggerTransporterSync();
    }
  }

}
