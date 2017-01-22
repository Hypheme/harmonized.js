const STATE = {
  // fixed states
  LOCKED: { STATE: 'LOCKED' },
  DELETED: { STATE: 'DELETED' }, // end of an item lifetime
  EXISTENT: { STATE: 'EXISTENT' }, // the item exists and everything is in sync
  // actions (result in state changes)
  // the item is being created -> results in state EXISTENT
  BEING_CREATED: { STATE: 'BEING_CREATED', ACTION: 'create' },
  // the item is being updated -> results in state EXISTENT
  BEING_UPDATED: { STATE: 'BEING_UPDATED', ACTION: 'update' },
  // the item is being deleted -> results in state DELETED
  BEING_DELETED: { STATE: 'BEING_DELETED', ACTION: 'delete' },
  // the item is resynced with the resource, results in state EXISTENT
  BEING_FETCHED: { STATE: 'BEING_FETCHED', ACTION: 'fetch' },
};

const ROLE = {
  TRANSPORTER: { ROLE: 'TRANSPORTER' },
  CLIENT_STORAGE: { ROLE: 'CLIENT_STORAGE' },
};

const SOURCE = {
  STATE: {
    SOURCE: 'STATE',
  },
  TRANSPORTER: {
    SOURCE: 'TRANSPORTER',
    NAME: 'transporter',
  },
  CLIENT_STORAGE: {
    SOURCE: 'CLIENT_STORAGE',
    NAME: 'clientStorage',
  },
};

const TARGET = {
  TRANSPORTER: {
    TARGET: 'TRANSPORTER',
    NAME: 'transporter',
    STATUS_KEY: 'synced',
    STATES: '_transporterStates',
    GET_FOR: '_getForTransporter',
    PROCESSOR: 'transporter',
    POST_SYNC_PROCESSOR: '_postSyncTransporter',
  },
  CLIENT_STORAGE: {
    TARGET: 'CLIENT_STORAGE',
    NAME: 'clientStorage',
    STATUS_KEY: 'stored',
    STATES: '_clientStorageStates',
    GET_FOR: '_getForClientStorage',
    PROCESSOR: 'clientStorage',
    POST_SYNC_PROCESSOR: '_postSyncClientStorage',
  },
};

// casting between constants:
TARGET.TRANSPORTER.AS_SOURCE = SOURCE.TRANSPORTER;
TARGET.CLIENT_STORAGE.AS_SOURCE = SOURCE.CLIENT_STORAGE;

SOURCE.TRANSPORTER.AS_TARGET = TARGET.TRANSPORTER;
SOURCE.CLIENT_STORAGE.AS_TARGET = TARGET.CLIENT_STORAGE;

ROLE.TRANSPORTER.AS_TARGET = TARGET.TRANSPORTER;
ROLE.CLIENT_STORAGE.AS_TARGET = TARGET.CLIENT_STORAGE;

const PROMISE_STATE = {
  PENDING: { PROMISE_STATE: 'PENDING' },
  RESOLVED: { PROMISE_STATE: 'RESOLVED' },
  NOT_FOUND: { PROMISE_STATE: 'NOT_FOUND' },
};

export { STATE, SOURCE, TARGET, PROMISE_STATE, ROLE };
