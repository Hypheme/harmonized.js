/**
 * Interface each local storage has to follow. To implement a local storage
 * just extend from this class.
 */
export default class InterfaceTransporter {

  constructor(store) {
    this._store = store;
  }

}
