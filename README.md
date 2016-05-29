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

It can be passed optional store instances which can be used in the items for relation.

```javascript
import {Store, NoLocalStorage} from 'harmonized';
import MyTransporter from './MyTransporter';
import MyItemClass from './MyItemClass';
import myOtherStore from '../myOtherStore';

const myStore = new Store({
  Transporter: MyTransporter,
  LocalStorage: NoLocalStorage,
  Item: MyItemClass,
  stores: {myOtherStore},
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
myItem.autoSave = true; // => gets stored and synced
myItem.title = 'new title again'; // => gets stored and synced

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
myItem.autoSave = true;
```

### remove and delete an item

Removing an item can be done via the store or the item. Note: the store state will always get updated no matter how you delete an item.

```javascript
myItem.remove(); // => gets deleted in store, local storage and synced
myItem.title = 'another title'; // nothing happens anymore
```

## fetch items

If your item is out of sync with the transporter you can trigger a fetch again. This is basically the same as store.fetch(item);

```javascript
myItem.fetch(); // gets the item from the transporter, saves it in the item and  
myItem.title = 'another title'; // will get overwritten by the fetch as soon as it arrives
```
