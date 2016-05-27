/**
 * Interface each local storage has to follow. To implement a local storage
 * just extend from this class.
 */
export default class InterfaceLocalStorage {

  constructor(store) {
    this._store = store;
  }

}
