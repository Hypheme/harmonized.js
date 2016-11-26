// /////////
// Store //
// /////////

// ///////////
// store setup //
// ///////////
class Store {}
class Item {}

class MyTransporter {}
class MyClientStorage {}
class MyItem {}

class MyStore extends Store {}
MyStore.Transporter = MyTransporter;
MyStore.ClientStorage = MyClientStorage;
MyStore.Item = MyItem;

// ////////////////////
// create stores //
// ////////////////////
let store = new MyStore();
//     inside item
store = new MyStore({
  parentItem: this,
});

MyStore.onceLoaded().then(() => 'do things');
MyStore.onceLoaded(() => 'do things via callback');
// ///////////
// store methods //
// ///////////
store.fetchAndCreate({
  id: 123,
}); // if the item doesnt exist in the state it's created

// find
store.find({
  name: 'johannes',
  lastname: 'merz',
}); // returns array
store.findOne({
  __id: 'runtimeId',
}); // returns first matched element
store.findAsync({}); // same as find, but returns a promise + waits until the store is in sync
store.findOneAsync({});
// manipulate
store.create(rawItem, {
  source: 'transporter',
}); // returns item

store.markCorruptItem(item); // removes item from the store (without any api or client storage calls)
// only if sth goes completly wrong

// ////////
// Item //
// ////////

// ///////////////
// item setup  //
// ///////////////

const anItemKeys = [
    // normal item property
  'brand',

    // default primary key
  {
    name: 'id',
    primary: true,
    key: 'id',
    _key: '_id',
  },

    // This is the definition for a relation to an existing store
  {
    name: 'driver',
    key: 'driverId',
    _key: '_driverId',
    store: myStoreInstance,
    storeKey: 'id',
    _storeKey: '_id',
  },

    // This is the definition to a relation to a seperate store inside the item
    // (1-1 relation)
    // NOT IMPLEMENTED YET
  // {
  //   name: 'steeringwheel',
  //   key: 'steeringwheelId',
  //   _key: '_steeringwheelId',
  //   store: SteeringWheelStoreClass,
  // },
  //
  //   // (1-n relation)
  //   [{
  //     name: 'wheels',
  //     key: 'wheels',
  //     _key: 'wheels',
  //     store: WheelStoreClass,
  //   }],

  // To be implemented!!!
  // new WheelStoreClass({Transporter: this.store.Transporter, ClientStorage: this.store.ClientStorage});
  //
  // WheelStoreClass.Item = MyFancyItem;
  //
  // static transporterOptions = {
  //   http: {
  //
  //   },
  //   socket: {
  //
  //   },
  // }
  //
  // static itemKeys: {
  //
  // }

];
class AnItem extends Item {

}
AnItem.keys = Item.autocompleteKeys(anItemKeys);

// ////////////////////
// create items //
// ////////////////////
// from transporter
let rawItemData = {
  brand: 'mercedes',
  driverId: 123, // will be fetched from existing store
  wheels: [1, 2, 3, 4], // every wheel will be fetched from transporter (4 additional api calls)
  steeringwheel: { // althoug a relation, it will be created right away without another call
    id: 456,
    kind: 'bigass steeringwheel',
  },
};
let item = new AnItem(rawItemData, {
  store,
  source: 'transporter',
});
// from client storage
rawItemData = {
  _syncState: 0, // refers to the sync state in the transporter
  brand: 'mercedes',
  _driverId: 123, // will be fetched from existing store
  wheels: [1, 2, 3, 4], // every wheel will be fetched from clientStorage (4 additional calls)
  steeringwheel: { // althoug a relation, it will be created right away without another call
    _id: 456,
    _syncState: 1,
    kind: 'bigass steeringwheel',
  },
};
item = new AnItem(rawItemData, {
  store,
  source: 'clientStorage',
});
// from state
rawItemData = {
  _syncState: 0, // refers to the sync state in the transporter
  brand: 'mercedes',
  driver: { // this can either be a harmonized object or a __id (runtimeId)
    harmonized: 'driverObject',
  },
  wheels: [{ // this is the raw data with which the weels are created in the store
    position: 'left front',
  }, {
    position: 'left back',
  }, {
    position: 'right front',
  }, {
    position: 'right back',
  }],
  steeringwheel: {
    kind: 'bigass steeringwheel',
  },
};
item = new AnItem(rawItemData, {
  store,
  source: 'clientStorage',
});

// ///////////
// methods //
// ///////////

item.fetch(); // fetches from transporter, returns harmonized promise
item.remove({ // same as item.delete
  source: 'transporter',
  parentOrder: true,
}); // returns harmonized promise
item.update(rawData, {
  source: 'transporter',
  noMerge: true, // this means, every key entry will be overwritten even if undefined
}); // returns harmonized promise


item.subscribe(anotherItem, 'key'); // foreign keys subscribe to an item
item.unsubscribe(anotherItem); // unsubscribe to the item
anotherItem.subscriptionTrigger('action', 'key', item);

// ////////////////
// explanations //
// ////////////////

// source:
//   the source is the origin of the action. Means, if a transporter creates an
//     item the source is transporter. This way the item knows not to sync with the
//     network for this action (the action is triggered by the network and therefor in
//     sync AFTER the action took place.)
// supported sources are:
//  - transporter
//  - clientStorage
//  - state (default)
//  - user (same as state)
//  - (parentItem) => not sure yet!
//
//  noMerge: true (default: false)
//    every time you update something you can choose to eihter merge the changes or not.
//    If you merge, only the keys of the given data are changed while the others stay
//    unaffected. If you don't merge all non-given keys are set to undefined.

// ////////////
// examples //
// ////////////

store
    .findOne({
      __id: 'runtimeId',
    })
    .delete({
      source: 'clientStorage',
    });
// the item with the runtimeId 'runtimeId' will get removed from the store,
// deleted from the api and then deleted from client storage

// the item may has new data from the api that needs to be fetched
store
    .findOne({
      id: 'transporterId',
    })
    .fetch()
    .then(({
        status,
        item,
    }) => {
      if (status === 'pending') alert('no connection');
    });
