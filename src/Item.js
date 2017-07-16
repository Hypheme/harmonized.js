import { observable, autorun/* , computed*/ } from 'mobx';
import uuid from 'uuid/v4';
import { STATE, SOURCE, PROMISE_STATE, TARGET } from './constants';

export default class Item {

  constructor({ store, autoSave }) {
    this.autoSave = !(autoSave === false);
    this._store = store;
    this._createRunTimeId();
    this._establishIsReadyPromises();
    this._syncPromises = {};
  }
  construct(values = {}, { source = SOURCE.STATE } = {}) {
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
    }).catch((err) => {
      this._lock(undefined, err);
      this.removed = true;
      throw err;
    });
  }

  @observable removed = false;
  @observable synced = true;
  @observable stored = true;

  // //////////////////
  // PUBLIC METHODS //
  // //////////////////

  onceReadyFor(target) {
    return this._isReady[target.NAME].promise;
  }

  isReadyFor(target) {
    return !this._isReady[target.NAME].resolve;
  }

  update(values, source = SOURCE.STATE) {
    return this._store.schema.setFrom(source, this, values)
      .then(() => this._synchronize(
        source === SOURCE.CLIENT_STORAGE ? STATE.EXISTENT : STATE.BEING_UPDATED,
        source === SOURCE.TRANSPORTER ? STATE.EXISTENT : STATE.BEING_UPDATED,
      ),
    );
  }

  delete(source) {
    return this.remove(source);
  }

  remove(source) {
    this.removed = true;
    this._store.remove(this);
    let p;
    switch (source) {
      case SOURCE.TRANSPORTER:
        this._transporterStates = {
          current: STATE.DELETED,
          inProgress: undefined,
          next: undefined,
        };
        p = this._synchronize(
          STATE.BEING_DELETED,
          undefined,
        );
        break;
      case SOURCE.CLIENT_STORAGE:
        this._clientStorageStates = {
          current: STATE.DELETED,
          inProgress: undefined,
          next: undefined,
        };
        p = this._synchronize(
          undefined,
          STATE.BEING_DELETED,
        );
        break;
      default:
        p = this._synchronize(
          // we mark it in clientStorage as being updated as it gets deleted after the
          // transporter deleted it. We need this to save our current wish (to delete)
          // in our clientStorage in case the app closes before the transporter is done
          // see this._postSyncTransporter
          STATE.BEING_UPDATED,
          STATE.BEING_DELETED,
        );
        break;
    }
    return p.then(() => {
      this._dispose();
      this._store.delete(this);
      // TODO (planned for version 0.3): this._onDeleteTrigger()
    });
  }

  fetch(source = SOURCE.TRANSPORTER) {
    return this._synchronize(
      source === SOURCE.CLIENT_STORAGE ? STATE.BEING_FETCHED : undefined,
      source === SOURCE.TRANSPORTER ? STATE.BEING_FETCHED : undefined,
    );
  }

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _computeInitialStates(initialState) {
    switch (initialState) {
      case STATE.BEING_CREATED:
      default:
        return {
          current: undefined,
          inProgress: undefined,
          next: undefined,
        };
      case STATE.BEING_DELETED:
      case STATE.BEING_UPDATED:
      case STATE.BEING_FETCHED:
        return {
          current: STATE.EXISTENT,
          inProgress: undefined,
          next: initialState,
        };
      case STATE.LOCKED:
      case STATE.EXISTENT:
      case STATE.DELETED:
        return {
          current: initialState,
          inProgress: undefined,
          next: undefined,
        };
    }
  }

  _computeTransporterStateForClientStorage() {
    return (this._transporterStates.next ||
      this._transporterStates.inProgress ||
      this._transporterStates.current).STATE;
  }

  _createRunTimeId() {
    this.__id = uuid();
  }

  _createFromClientStorage(values) {
    this._transporterStates =
      this._computeInitialStates(values._transporterState || STATE.BEING_CREATED);
    this._clientStorageStates =
    this._computeInitialStates(STATE.EXISTENT);
    this.removed = (this._transporterStates.next === STATE.BEING_DELETED);
    this.stored = true;
    // note undefined, undefined, undefined is a state for a newly created item so we have to
    // take this one in account as a new created item is never synced
    this.synced = (this._transporterStates.next === undefined && !(
      this._transporterStates.next === undefined &&
      this._transporterStates.inProgress === undefined &&
      this._transporterStates.current === undefined
    ));
    this._setPrimaryKey(SOURCE.CLIENT_STORAGE, values);
    return this._store.schema.setFrom(SOURCE.CLIENT_STORAGE, this, values,
      { establishObservables: true });
  }

  _createFromState(values) {
    this.synced = false;
    this.stored = false;
    this.removed = false;
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
    this._setPrimaryKey(SOURCE.TRANSPORTER, values);
    return this._store.schema.setFrom(SOURCE.TRANSPORTER, this, values,
      { establishObservables: true });
  }

  _establishIsReadyPromises() {
    function genPromise() {
      const result = {};
      result.promise = new Promise((resolve, reject) => {
        result.resolve = resolve;
        result.reject = reject;
      });
      return result;
    }
    this._isReady = {
      transporter: genPromise(),
      clientStorage: genPromise(),
    };
  }

  _getDesiredFixedState(action) {
    switch (action) {
      case STATE.BEING_CREATED:
      case STATE.BEING_UPDATED:
      case STATE.BEING_FETCHED:
        return STATE.EXISTENT;
      case STATE.BEING_DELETED:
        return STATE.DELETED;
      default:
        return STATE.LOCKED;
    }
  }

  _getForClientStorage(target, itemKeys) {
    itemKeys._transporterState = this._computeTransporterStateForClientStorage();
    return this._store.schema.getFor(target, this, itemKeys);
  }

  _getForTransporter(target, itemKeys) {
    return this._store.schema.getFor(target, this, itemKeys);
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
      case STATE.EXISTENT:
        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED, STATE.BEING_FETCHED];
        break;
      case STATE.LOCKED:
        return undefined;
      case STATE.DELETED: // pretty much the same as BEING_DELETED.
        return undefined;
      case undefined:
        if (next === undefined && newState === undefined) {
          return STATE.BEING_CREATED;
        }

        if (next !== STATE.BEING_CREATED) {
          return newState === STATE.BEING_CREATED ? STATE.BEING_CREATED : undefined;
        }

        allowedNewStates = [STATE.BEING_UPDATED, STATE.BEING_DELETED];
        break;
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
    if (workingState === STATE.BEING_DELETED) {
      return this._removeSingle(SOURCE.TRANSPORTER);
    }
    return this._synchronizeFor(TARGET.CLIENT_STORAGE, STATE.BEING_UPDATED);
  }

  /**
   * this does basically the same as remove, but for only one state and by circumventing
   * _synchronize.
   * We need this, because we would otherwise create promise loops, eg a promise waits
   * for itself to get resolved. This happens because the tarted/source switching
   * in the process.
   *
   * An example: _synchronize(STATE.BEING_UPDATED, STATE.EXISTENT)
   * -> results in an update operation in the clientStorage branch.
   * <- the clientStorage returns PROMISE_STATE.NOT_FOUND
   * -> we now delete the item in the transporter
   * <- the transporter returns ok
   * now (as usual, when sth gets removed in the transporter,
   *   we want to delete it in clientStorage as well)
   * BUT: if we would use our public remove function, _synchronize would get triggered
   * and as nothing would have changed in the clientStorage branch (remember,
   * we are already deleted in here, thats what started this whole thing),
   * _synchronize would not create a new promise but return the last one...
   * which is the promise from the first _synchronize
   *
   * => we would wait on our owm promise to be resolved to resolve
   * => never resolved
   */
  _removeSingle(source) {
    this.removed = true;
    this._store.remove(this);
    let p;
    switch (source) {
      default:
      case SOURCE.TRANSPORTER:
        this._transporterStates.current = STATE.DELETED;
        if (this._clientStorageStates.current === STATE.DELETED) {
          return Promise.resolve();
        }
        p = this._synchronizeFor(
          TARGET.CLIENT_STORAGE,
          STATE.BEING_DELETED,
        );
        break;
      case SOURCE.CLIENT_STORAGE:
        this._clientStorageStates.current = STATE.DELETED;
        if (this._transporterStates.current === STATE.DELETED) {
          return Promise.resolve();
        }
        p = this._synchronizeFor(
          TARGET.TRANSPORTER,
          STATE.BEING_DELETED,
        );
        break;
    }
    return p.then(() => {
      this._dispose();
      // TODO (maybe): this._store.delete(this);
      // TODO (planned for version 0.3): this._onDeleteTrigger()
    });
  }

  _setNextStateFor(target, state) {
    this[target.STATES].next = this._getNextActionState(
      this[target.STATES].inProgress || this[target.STATES].current,
      this[target.STATES].next,
      state);
  }

  _setPrimaryKey(source, data) {
    this._store.schema.setPrimaryKey(source, this, data);
    this._isReady[source.NAME].resolve();
    this._isReady[source.NAME].resolve = undefined;
    this._isReady[source.NAME].reject = undefined;
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
    return Promise.all([
      // the order matters as we need to make sure the transporterState is set before
      // getFor(clientStorage) is called.
      this._synchronizeFor(TARGET.TRANSPORTER, transporterState),
      this._synchronizeFor(TARGET.CLIENT_STORAGE, clientStorageState),
    ]);
  }

  _synchronizeFor(target, state) {
    // we need information if a snyc is already happening before overwriting state
    const syncInProgress = this[target.STATES].inProgress
      || this[target.STATES].next;
    this._setNextStateFor(target, state);
    // we only call _triggerSync if a sync is not already happening AND the new merged state
    // needs a sync
    if (!syncInProgress && this[target.STATES].next) {
      this[target.STATUS_KEY] = false;
      this._syncPromises[target.NAME] = this._triggerSync(target)
        .then(() => {
          this[target.STATUS_KEY] = true;
        })
        .catch(err => this._lock(target, err));
    }

    return this._syncPromises[target.NAME];
  }

  _triggerSync(target) {
    const workingState = this[target.STATES].next;
    // all actions except creating a new item need the primary key
    const itemKeys = workingState === STATE.BEING_CREATED ? {} :
      this._store.schema.getPrimaryKey(target, this);
    return ((workingState === STATE.BEING_DELETED || workingState === STATE.BEING_FETCHED) ?
      Promise.resolve(itemKeys) : // no payload needed for deleting/fetching
      this[target.GET_FOR](target, itemKeys))
    .then((itemData) => {
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
        .then((result) => {
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
          // the item was deleted by another client
          if (result.status === PROMISE_STATE.NOT_FOUND && workingState !== STATE.BEING_DELETED) {
            this[target.STATES].next = this._getNextActionState(
              this[target.STATES].current,
              this[target.STATES].inProgress,
              this[target.STATES].next);
            this[target.STATES].inProgress = undefined;
            return this._removeSingle(target.AS_SOURCE);
          }
          if (this[target.STATES].inProgress === STATE.BEING_CREATED) {
            this._setPrimaryKey(target.AS_SOURCE, result.data);
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
