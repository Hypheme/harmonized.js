// /////////
// Store //
// /////////

// ///////////
// store setup //
// ///////////
class Schema {}
class Store {}
// class Item {}

const driverStoreInstance = {};
const passengerStoreInstance = {};
const wheelsStoreInstance = {};

class MyTransporter {}
class MyClientStorage {}
class MyItem {}

class MyStore extends Store {
  static schema = new Schema({
    brand: String,
    price: { type: Number, observable: false },
    seats: { // nested object instead of internal stores first
      front: Number,
      back: Number,
    },
    // id: Schema.Key, // in there by default
    // or long: id: Key
    // {
    //   type: Key,
    //   key: 'id',
    //   _key: '_id',
    // },
    driver: {
      type: Schema.Key,
      key: 'driverId', // -> toTransporter driver transforms to
        //  car.driverId === driver.primaryKey(TRANSPORTER)
      _key: '_driverId',
      ref: driverStoreInstance,
    },
    passengers: [{
      type: Schema.Key,
      // no key given, toTransporter transforms to car.passengers == [{ driver object1 }, ...]
      // no _key given, toClientStorage transforms to car.passengers == [{ driver object1 }, ...]
      ref: passengerStoreInstance,
    }],
    wheels: [{
      type: Schema.Key,
      key: plainWheel => plainWheel.id, // transforms to car.wheels == [1, 2, 3, ...]
      _key: '_wheelId',
      ref: wheelsStoreInstance,
    }],
  });
}
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
store.create(/* rawItem, */ {
  source: 'transporter',
}); // returns item

// removes item from the store (without any api or client storage calls)
store.markCorruptItem(/*item*/);
// only if sth goes completly wrong

// ////////
// Item //
// ////////

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
class AnItem {}
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
let rawData;
let anotherItem;
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
    .then((/* {
         status,
         item,
    }*/) => {
      /* if (status === 'pending') alert('no connection')*/
    });
