# harmonized.js

Coming soon...

state, storage and server manager for react and react-native based on mobx.js

# usage

## store

### creating a new store (DEPRECATED):

A store needs three different classes:

- Transporter: harmonized network transporter
- LocalStorage: harmonized local storage
- Item: items the store contains

```javascript
import {Store, NoLocalStorage} from 'harmonized';
import MyTransporter from './MyTransporter';
import MyItemClass from './MyItemClass';
import myOtherStore from '../myOtherStore';

const myStore = new Store({
  Transporter: MyTransporter,
  LocalStorage: NoLocalStorage,
  Item: MyItemClass,
});
export myStore;
```

Each Store creates its own transporter and local storage instance. It then fetches the data of the store and transporter and creates items out of each entry. It fetches three times and passes the results to the next fetch. This way the transporter and the local storage can decide how to initiate the state of the store. Fetches go in the following order:

- localStorage.initialFetch()
- transporter.initialFetch(localStorageItems)
- localStorage.followUpFetch(transporterItems)

### methods

```javascript
// fetch
// NOT TO SURE ABOUT THIS YET, some ideas in the comments
store.fetchOne({ id: 123 }); // if the item doesnt exist in the state it's ignored
store.fetchOneAndCreate({ id: 123 }); // if the item doesnt exist in the state it's created

// find
store.find({ name: 'johannes', lastname: 'merz' }); // returns array
store.findOne({ __id: 'runtimeId' }); // returns first matched element

// manipulate
store.create(rawItem, { source: 'transporter' }); // returns item
```

## item interface

### creation

You don't want to create an item directly. Use store.create(rawItem) instead.

### manipulation

Item manipulation is usually handled by mobx. But there are ways you can influence item behavior:

Per default, autoUpdate is set to true. This means, as soon as you change the item raw data, the item is updated in the client storage as well as in the transporter. If you want to change multiple item entries at the same time, you can deactivate autoUpdate, make the change and activate autoUpdate again or you can leave autoUpdate set to false and trigger it by yourself.

```javascript
myItem.fetch(); // fetches from transporter, returns harmonized promise
myItem.delete({ source: 'transporter' }); // returns harmonized promise
myItem.update(rawData, { source: 'transporter', noMerge: true }); // returns harmonized promise

// supported sources are:
//  - transporter
//  - clientStorage
//  - state (default)
//  - user (same as state)

// autoUpdate = true
myItem.title = 'new title'; // => gets stored and synced

myItem.autoUpdate = false;
myItem.title = 'another title';
myItem.data = 'moar data';
myItem.autoUpdate = true;
myItem.title = 'new title again'; // => gets stored and synced

myItem.autoUpdate = false;
myItem.title = 'another title';
myItem.data = 'moar data';
myItem.enableAutoUpdateAndUpdate();  // => gets stored and synced
myItem.title = 'new title again'; // => gets stored and synced
```

You can save the items content locally at any point with saveLocal(content = undefined)
This is useful if you want to update some local information, which the transporter doesn't need anyway,
like information from incoming notifications (the server sent this, so he already knows...).

```js
myItem.saveLocal();

 // change item content before saving
myItem.saveLocal({title:'another title'});
// short for
myItem.autoSave = false;
myItem.title = 'another title';
myItem._syncStatus = 0;
myItem.enableAutoSaveAndSave();
```

### remove and delete an item

Removing an item can be done via the store or the item. Note: the store state will always get updated no matter how you delete an item.

```javascript
myItem.remove(); // => gets deleted in store, local storage and synced
myItem.title = 'another title'; // nothing happens anymore
```

### fetch items

If your item is out of sync with the transporter you can trigger a fetch again. This is basically the same as store.fetch(item);

```javascript
myItem.fetch(); // gets the item from the transporter, saves it in the item and  
myItem.title = 'another title'; // will get overwritten by the fetch as soon as it arrives
```

### Relations

You can reference items from other stores in your items. You can either use stores that are already existent and just reference items from it or create a new store that only exists for the item it belongs to.

To explain this a little better here are two examples for each of the relation types:

#### Reference items from existing stores:

You have two routes in your backend:

```
/cars
/drivers
```

In an `cars` item you reference drivers that drive the car so you can display them in the `cars` view. When information about the driver updates this driver will also updates in it's reference in the `cars` item.

Your model could look like this:

```javascript
// Cars Store
[{
  id: 1, 
  brand: 'Volkswagen',
  driver: {
    id: 123,
    name: 'John Doe',
  },
}, {
  id: 2, 
  brand: 'BMW',
  driver: null,
}]

// Drivers Store
[{
  id: 123,
  name: 'John Doe',
}]
```

#### Seperate store inside each item

For this you also have two routes on the backend:

```
/users
/users/:id/cars
```

In this example the `/users/:id/cars` show the cars owned by the user. You don't have a single `/cars` route in this example so for this you need a store that just belongs to a single item. Items added to the `cars` store only are added for the specific user.

Your model would look like this:

```javascript
// users store
[{
  id: 123, 
  name: 'John Doe',
  // 
  cars: [
    {id: 1, brand: 'Volkswagen'}, 
    {id: 2, brand: 'BMW'},
  ],
}, {
  id: 321, 
  name: 'Jane Doe',
  // 
  cars: [
    {id: 1, brand: 'Mercedes-Benz'}, 
    {id: 2, brand: 'Audi'},
  ],
}]
```

#### Define your relations

The relations of an item is defined together with the other item properties in the item's data structure difinition. To make a property a reference to another store, you need to define the name of the store to refer from in the property options. The `storeKey` option then describes the name of the primary key of the referenced store item. The `key` option defines the name of the key in the transporter endpoint (e.g. your API). Both have an equivalent for the client storage (`_key` and `_storeKey`) which are optional (the default value is the transporter version with a prepended `_`).

```javascript
[
  'brand',
  { name: 'id', primary: true, key: 'id', _key: '_id' },
  
  // This is the definition for a relation to an existing store
  { name: 'driver', key: 'driverId', _key: '_driverId', store: 'drivers', storeKey: 'id', _storeKey: '_id' },
  
  // This is the definition to a relation to a seperate store inside the item 
  // (1-1 relation)
  { name: 'steeringwheel', key: 'steeringwheelId', _key: '_steeringwheelId', store: SteeringWheelStoreClass },
  
  // (1-n relation)
  [{ name: 'wheels', key: 'wheels', _key: 'wheels', store: WheelStoreClass }],
  
];
```

### ClientStorage and Transporter

Client storages and transporters are used to syncronize your items with a local database and remote API. When you use ready made client storages and transporters you don't have to worry about their interface. If you need more functionality in the transporters however, you can extend these (or the base classes) and write your own.

Transporters and ClientStorages need the following interface:

```javascript
create() {}
remove() {} // only for ClientStorage
update() {}
delete() {}
fetch() {}
fetchOne() {}
initialFetch() {}
```

#### create()

Creates a new item (e.g. `POST` HTTP request on an API or `INSERT INTO` instruction for SQL).

#### remove()

This is only needed for the client storage. It is there to mark an item as deleted but does not actually delete it until it is successfully deleted in the `Transporter`.

#### update()

Updates an existing item (e.g. `PUT` HTTP request on an API or `UPDATE` instruction for SQL).

#### delete()

Deletes an existing item. In the client storage this is called when the transporter delete transaction was successfull.

#### fetch()

Fetches everything from the transporter or client storage.

#### fetchOne()

Fetches only a specific item.

#### initialFetch()

Is called when the application is started. This can do nothing when your implementation doesn't need/does initial fetching.

### TODO harmonized promises

# Hack Harmonized

When you want to contribute to the harmonized ecosystem by creating own Transporters, ClientStorages or middleware for those, then have a look in our [wiki](https://github.com/Hypheme/harmonized.js/wiki)
