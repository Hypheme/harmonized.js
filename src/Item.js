import { observable, autorun, computed } from 'mobx';

export default class Item {
  constructor(store, values = { _syncState: 1 }) {
    this._store = store;
    if (values._id) {
      this._storeState = 0;
    } else {
      this._storeState = 1;
    }
    const keys = this.rawItemKeys;
    keys.push('id', '_id', '_syncState');
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (values[key] !== undefined) {
        this[key] = values[key];
      }
    }
    this.dispose = autorun(() => this._stateHandler());
  }

  // ///////////////////
  // PRIVATE METHODS //
  // ///////////////////

  _stateHandler() {}
}
