import { observable, autorun, computed } from 'mobx';

export default class Item {
  constructor(store, values, options) {
    this.store = store;
  }
}
