class EmptyTransporter {}

import {
  observable,
} from 'mobx';

export default class Store {

  transporterOptions = {
    http: {
      url: 'http',
    },

    socket: {
      url: 'http',
    },

    indexedDb: {
      tableName: '123',
    },
  };

  constructor({ Item, Transporter, Storage }) {
    this.Item = Item;

    if (Transporter) {
      this.transporter = new Transporter(transporterOptions[Transporter.name]);
    } else {
      this.transporter = new EmptyTransporter();
    }

    this.storage = Storage || new EmptyTransporter();
  }

  @observable store = [];
  @observable deleted = [];

  // This is used to add store to an item (as a sub store)
  static useWith(Item, transporter, store) {
    // Returns "create" function
    return () => new this({ Item, transporter, store });
  }
}
