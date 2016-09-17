# harmonized.js

Coming soon...

state, storage and server manager for react and react-native based on mobx.js

# usage

## store

### creating a new store:

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

### fetch the store

Although the store fetches its content on creation, you may want to fetch its content (or part of it) at some point again. You can do so by calling the fetch method. If you give it an item, only the item will get fetched. Otherwise, the complete store.

The fetch is only transporter related as the local store is always in sync with the state anyway.

The fetch routine returns a promise, but you won't need it very often as the stores state is changed and your views are updated.

```javascript
myStore.fetch().then(() => {
  console.log('store is fetched');
})
myStore.fetch(item).then(() => {
  console.log('item is fetched');
})
```

### item related actions

you can create or remove an item from a store:

```javascript
const myItem = myStore.create({title: 'some title', data: 'some data'});
myStore.remove(myItem);
```

In both cases, the item is updated in the local storage as well as in the transporter.

## item interface

### creation

You don't want to create an item directly. Use store.create(rawItem) instead.

### manipulation

Item manipulation is usually handled by mobx. But there are ways you can influence item behavior:

Per default, autoSave is set to true. This means, as soon as you change the item raw data, the item is updated in the local storage as well as in the transporter. If you want to change multiple item entries at the same time, you can deactivate autoSave, make the change and activate autoSave again or you can leave autoSave set to false and trigger it by yourself.

```javascript
// autoSave = true
myItem.title = 'new title'; // => gets stored and synced

myItem.autoSave = false;
myItem.title = 'another title';
myItem.data = 'moar data';
myItem.autoSave = true;
myItem.title = 'new title again'; // => gets stored and synced

myItem.autoSave = false;
myItem.title = 'another title';
myItem.data = 'moar data';
myItem.enableAutoSaveAndSave();  // => gets stored and synced
myItem.title = 'new title again'; // => gets stored and synced

myItem.autoSave = true;
myItem.set({
  title: 'another title',
  data: 'some data',
}); // just 1 sync, autoSave == true

myItem.autoSave = false;
myItem.set({
  title: 'another title',
  data: 'some data',
}); // no sync at all, autoSave == false
myItem.save(); // items get synced

myItem.save({
  title: 'another title',
  data: 'some data',
}); // shortcut for myItem.set({...}).save();

myItem.autoSave = false;
myItem.title = 'another title';
myItem.data = 'moar data';
myItem.save() // => gets stored and synced
myItem.title = 'new title again'; // autoSave still off
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

