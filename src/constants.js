const STATE = {
  // fixed states
  LOCKED: { STATE: 'LOCKED' },
  DELETED: { STATE: 'DELETED' }, // end of an item lifetime
  REMOVED: { STATE: 'REMOVED' }, // removed locally but not yet deleted
  EXISTENT: { STATE: 'EXISTENT' }, // the item exists and everything is in sync
  // actions (result in state changes)
  // the item is being created -> results in state 0
  BEING_CREATED: { STATE: 'BEING_CREATED', ACTION: 'create' },
  // the item is being updated -> results in state 0
  BEING_UPDATED: { STATE: 'BEING_UPDATED', ACTION: 'update' },
  // the item is being deleted -> results in state -2
  BEING_DELETED: { STATE: 'BEING_DELETED', ACTION: 'delete' },
  // the item is being removed -> results in state -1
  BEING_REMOVED: { STATE: 'BEING_REMOVED', ACTION: 'remove' },
  // the item is resynced with the resource, results in state 0
  BEING_FETCHED: { STATE: 'BEING_FETCHED', ACTION: 'fetch' },
};

const SOURCE = {
  STATE: {
    SOURCE: 'STATE',
  },
  TRANSPORTER: {
    SOURCE: 'TRANSPORTER',
    IS_READY: 'transporter',
  },
  CLIENT_STORAGE: {
    SOURCE: 'CLIENT_STORAGE',
    IS_READY: 'clientStorage',
  },
};
SOURCE.USER = SOURCE.STATE;

const TARGET = {
  TRANSPORTER: {
    TARGET: 'TRANSPORTER',
    AS_SOURCE: SOURCE.TRANSPORTER,
    STATES: '_transporterStates',
    PROCESSOR: 'transporter',
    POST_SYNC_PROCESSOR: '_postSyncTransporter',
  },
  CLIENT_STORAGE: {
    TARGET: 'CLIENT_STORAGE',
    AS_SOURCE: SOURCE.CLIENT_STORAGE,
    STATES: '_clientStorageStates',
    PROCESSOR: 'clientStorage',
    POST_SYNC_PROCESSOR: '_postSyncClientStorage',
  },
};

const PROMISE_STATE = {
  PENDING: { PROMISE_STATE: 'PENDING' },
  RESOLVED: { PROMISE_STATE: 'RESOLVED' },
};

export { STATE, SOURCE, TARGET, PROMISE_STATE };
