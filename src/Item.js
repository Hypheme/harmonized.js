import { observable, autorun/* , computed*/ } from 'mobx';
import uuid from 'uuid-v4';
import { STATE, SOURCE, PROMISE_STATE, TARGET } from './constants';

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
      this._lock(undefined, err);
      this.removed = true; // TODO we remove item from store
      throw err;
    });
  }

  @observable removed = false;
  @observable synced = true;
  @observable stored = true;

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _computeInitialStates(initialState) {
    switch (initialState) {
      case STATE.BEING_CREATED:
        return {
          current: undefined,
          inProgress: undefined,
          next: initialState,
        };
      case STATE.BEING_DELETED:
      case STATE.BEING_UPDATED:
      case STATE.BEING_FETCHED:
      case STATE.BEING_REMOVED:
        return {
          current: STATE.EXISTENT,
          inProgress: undefined,
          next: initialState,
        };
      case STATE.LOCKED:
      case STATE.REMOVED:
      case STATE.EXISTENT:
      case STATE.DELETED:
        return {
          current: initialState,
          inProgress: undefined,
          next: undefined,
        };
      default:
        throw new Error('inkown initial state');
    }
  }

  _createRunTimeId() {
    this.__id = uuid();
  }

  _createFromClientStorage(values) {
    this._transporterStates =
      this._computeInitialStates(values._transporterState || STATE.BEING_CREATED);
    this._clientStorageStates =
      this._computeInitialStates(this._transporterStates.next === STATE.BEING_DELETED ?
        STATE.REMOVED : STATE.EXISTENT);
    this.removed = (this._clientStorageStates.current === STATE.REMOVED);
    this.stored = true;
    this.synced = (this._transporterStates.next === undefined);
    this._store.schema.setPrimaryKey(this, values);
    return this._store.schema.setFrom(SOURCE.CLIENT_STORAGE, this, values,
      { establishObservables: true });
  }

  _createFromState(values) {
    this.synced = false;
    this.stored = false;
    this.removed = false;
    // TODO change this to states
    this._transporterStates = this._computeInitialStates(STATE.BEING_CREATED);
    this._clientStorageStates = this._computeInitialStates(STATE.BEING_CREATED);
    // no need for keys as its from the state and therefore has no keys yet
    return this._store.schema
      .setFrom(SOURCE.STATE, this, values, { establishObservables: true });
  }

  _createFromTransporter(values) {
    this._transporterStates = this._computeInitialStates(STATE.EXISTENT);
    this._clientStorageStates = this._computeInitialStates(STATE.BEING_CREATED);
    this.removed = false;
    this.stored = false;
    this.synced = true;
    this._store.schema.setPrimaryKey(this, values);
    return this._store.schema.setFrom(SOURCE.TRANSPORTER, this, values,
      { establishObservables: true });
  }

  _getDesiredFixedState(action) {
    switch (action) {
      case STATE.BEING_CREATED:
      case STATE.BEING_UPDATED:
      case STATE.BEING_FETCHED:
        return STATE.EXISTENT;
      case STATE.BEING_DELETED:
        return STATE.DELETED;
      // case STATE.BEING_REMOVED: // TODO: not sure if needed
      //   return STATE.REMOVED;
      default:
        return STATE.LOCKED;
    }
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
      case undefined:
        if (next !== STATE.BEING_CREATED) {
          return newState === STATE.BEING_CREATED ? STATE.BEING_CREATED : undefined;
        }
        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED];
        break;
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

  _getNextFixedState(current, action) {
    switch (current) {
      case STATE.LOCKED:
      case STATE.DELETED:
        return current;
      // case STATE.REMOVED:
      //   return this._getDesiredFixedState(action) === STATE.DELETED ?
      //     STATE.DELETED : STATE.REMOVED;
      default:
        return this._getDesiredFixedState(action);
    }
  }

  _lock(origin, err) {
    this._transporterStates = {
      current: STATE.LOCKED,
      inProgress: undefined,
      next: undefined,
    };
    this._clientStorageStates = {
      current: STATE.LOCKED,
      inProgress: undefined,
      next: undefined,
    };
    this.error = {
      origin,
      error: err,
    };
    if (this._dispose) {
      this._dispose();
    }
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
        throw new Error('invalid merge parameters');
    }
  }

  _postSyncClientStorage() {
    return Promise.resolve();
  }

  _postSyncTransporter(workingState) {
    const itemKeys = this._store.schema.getPrimaryKey(TARGET.CLIENT_STORAGE, this);
    if (workingState === STATE.BEING_DELETED) {
      return this._store.clientStorage.delete(itemKeys);
    }
    return this._store.schema.getFor(TARGET.CLIENT_STORAGE, this, itemKeys)
      .then(data => this._store.clientStorage.update(data));
  }

  // TODO get _transporterState we will compute _transporterState out of _transporterStates

  _setNextStoreState(state) {
    this._clientStorageStates.next = this._getNextActionState(
      this._clientStorageStates.inProgress || this._clientStorageStates.current,
      this._clientStorageStates.next,
      state);
  }
  _setNextTransporterState(state) {
    this._transporterStates.next = this._getNextActionState(
      this._transporterStates.inProgress || this._transporterStates.current,
      this._transporterStates.next,
      state);
  }

  _stateHandler(call) {
    this._store.schema.getObservables(this); // we need this for mobx
    if (call === 0) {
      this._synchronize();
    }
    if (this.autoSave) {
      this._synchronize(STATE.BEING_UPDATED, STATE.BEING_UPDATED);
    }
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
    if (!clientStorageSyncInProgress && this._clientStorageStates.next) {
      this.stored = false;
      this._triggerSync(TARGET.CLIENT_STORAGE)
        .then(() => {
          this.stored = true;
        })
        .catch(err => this._lock(TARGET.CLIENT_STORAGE, err));
    }
    if (!transporterSyncInProgress && this._transporterStates.next) {
      this.synced = false;
      this._triggerSync(TARGET.TRANSPORTER)
        .then(() => {
          this.synced = true;
        })
        .catch(err => this._lock(TARGET.TRANSPORTER, err));
    }
  }

  _triggerSync(target) {
    const workingState = this[target.STATES].next;
    // all actions except creating a new item need the primary key
    const itemKeys = workingState === STATE.BEING_CREATED ? {} :
      this._store.schema.getPrimaryKey(target, this);
    return ((workingState === STATE.BEING_DELETED || workingState === STATE.BEING_FETCHED) ?
      Promise.resolve(itemKeys) : // no payload needed for deleting/fetching
      this._store.schema.getFor(target, this, itemKeys))
    .then(itemData => {
      if (!this[target.STATES].next) {
        // if next is no longer set due to merging create and delete action together
        return Promise.resolve();
      }
      if (workingState !== this[target.STATES].next) {
        // redo everything if sth has changed in the meantime
        return this._triggerSync(target);
      }
      this[target.STATES].inProgress = workingState;
      this[target.STATES].next = undefined;
      // this is the actual call to the outside world
      return this._store[target.PROCESSOR][workingState.ACTION](itemData)
        .then(result => {
          if (result.status === PROMISE_STATE.PENDING) {
            this[target.STATES].next = this._getNextActionState(
              this[target.STATES].current,
              this[target.STATES].inProgress,
              this[target.STATES].next);
            this[target.STATES].inProgress = undefined;
            return this._store[target.PROCESSOR].onceAvailable()
              .then(() => {
                if (this[target.STATES].next) { // need that bc create + delete result in undefined
                  return this._triggerSync(target);
                }
                return Promise.resolve();
              });
          }
          if (this[target.STATES].inProgress === STATE.BEING_CREATED) {
            this._store.schema.setPrimaryKey(target.AS_SOURCE, this, result.data);
          }
          this[target.STATES].current = this._getNextFixedState(
            this[target.STATES].current,
            workingState);
          this[target.STATES].inProgress = undefined;
          return (workingState === STATE.BEING_FETCHED ?
            this._store.schema.setFrom(target.AS_SOURCE, this, result.data) :
            Promise.resolve())
            .then(() => this[target.POST_SYNC_PROCESSOR](workingState))
            .then(() => {
              if (this[target.STATES].next) {
                return this._triggerSync(target);
              }
              return Promise.resolve();
            });
        });
    });
  }
}
