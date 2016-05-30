import {
  observable,
  autorun,
  computed,
} from 'mobx';
import uuid from 'node-uuid';

export default class Item {
  constructor(store, values, options) {
    this.store = store;
  }
}
