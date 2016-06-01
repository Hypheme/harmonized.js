export default class TestStore {
  constructor({ Item, Transporter, LocalStorage }) {
    this.store = [];
    this.Item = Item;
    this.localStorage = new LocalStorage(this);
    this.transporter = new Transporter(this);
  }

  delete() {}
  remove() {}

}
