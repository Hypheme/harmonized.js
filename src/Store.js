import {
  observable,
} from 'mobx';

export default class Store {

  @observable items = [];
  @observable loaded = false;
  // @observable deletedItems = [];
  constructor(/* { Item, schema, transporter, clientStorage }*/) {

  }

  create() {}
  fetchAndCreate() {} // same as findOneOrFetch
  fetch() {} // maybe? fetches again from the given SOURCE, defaults to transporter

  find() {} // returns array of items
  findOne() {} // returns item or undefined
  findOneOrFetch() {} // returns promise which resolves in harmonized promise

  isLoaded() {}

  onceLoaded() {}

  remove() {}
}
