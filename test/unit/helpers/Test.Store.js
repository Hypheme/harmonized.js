export default class TestStore {
  constructor({ Item, Transporter, LocalStorage }) {
    this.stores = {};
    this.Item = Item;
    this.localStorage = new LocalStorage(this);
    this.transporter = new Transporter(this);
  }

  delete() {}
  remove() {}
  resolveAsync() {}
}
