const STATE = {
  // fixed states
  LOCKED: -3, // this state is needed to prevent multiple delete actions from happening
  DELETED: -2, // end of an item lifetime
  REMOVED: -1, // removed locally but not yet deleted
  EXISTENT: 0, // the item exists and everything is in sync
  // actions (result in state changes)
  BEING_CREATED: 1, // the item is being created -> results in state 0
  BEING_UPDATED: 2, // the item is being updated -> results in state 0
  BEING_DELETED: 3, // the item is being deleted -> results in state -2
  BEING_REMOVED: 4, // the item is being removed -> results in state -1
  BEING_FETCHED: 5, // the item is resynced with the resource, results in state 0
};
const ACTION = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  REMOVE: 'remove',
  FETCH: 'fetch',
};

export { STATE, ACTION };
