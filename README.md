[![Build Status](https://travis-ci.org/Hypheme/harmonized.js.svg?branch=master)](https://travis-ci.org/Hypheme/harmonized.js) [![codecov](https://codecov.io/gh/Hypheme/harmonized.js/branch/master/graph/badge.svg)](https://codecov.io/gh/Hypheme/harmonized.js) [![Dependency Status](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304) [![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)   

# harmonized.js

Offline first – state, storage and server manager (optimized for react) based on MobX

## Why?

Being offline sucks when using a web app! When loosing your connection, you can't create or edit
items  to your liking, because the web app can't handle unsent requests after connecting again. And
even if it does: One crash, accidental browser reload or closed tab and all done changes are gone.

Handling this by just storing unsent requests persistently to send them on connection also isn't
solving the issue that you can't see your app state when accessing your web app offline. Even when
you use a Progressive Web App to cache the static files.

### What harmonized can do for you

To solve this, harmonized is storing your state offline persistently and keeps it in sync with the
data your web app is getting from your (or even third party) backend. When using a Progressive Web
App offline, Harmonized serves the locally stored data, even when the backend is unreachable. When
being online, it speeds up display of the data, because the app can display the local state before
it receives the state from your backend. When receiving just updates from the backend you can even
keep network traffic at a minimum.

But it can do more: Be it a flakey internet connection or your backend having some issue, your
client app will (almost) work like before. Creating or editing items of the state is no problem.
When the connection is established again, it will sync all the changes with the backend.

## How harmonized works

When building harmonized we tried it to be as close to the structure your API resources has. The
structure of harmonized is therefore model base. For the best experience, your backend should expose
simple model based resources (like car, driver, passenger, ...), so harmonized ca directly handle
the data that is coming from the backend.

The structure that you will use the most are **Stores** and **Items**. A `Store` is basically a list
of Items. It just handles the creation of new items that belong to it. You can also fetch data from
backend, search for one or more specific entries. The `Store` also holds the `Schema` that describes
the data structure of the Items. The `Item` represents one entry in this list. You will do the most
work here. Just update the data here, save it (or with `autoSave` activated, it saves on any change
to the item data), delete the item, or fetch a new state  just for this item from your backend.

To sync your local non-persistent data with your backend and/or a local database, you need to add
a `Transporter` and/or a `ClientStorage` to the `Store`. A `Transporter` handles syncing data with
a backend (generally over the network). A `ClientStorage` does the same with a local database. Both
share the same interface, so it is possible to use a `Transporter` instead of a `ClientStorage` and
vice-versa (we don't wan't to know what dirty things you want to do with this). To use these, the
only thing you need to do is to add a instance of a `Transporter` and/or `ClientStorage` to the
`Store`. The rest is handled automatically. When you save an `Item`, the app state is synced with
the connected backend and database endpoint.

## Modularity

Harmonized is build with modularity in mind. We know that every backend is a little different, maybe
not using a REST HTTP API, but WebSockets, JSON Pure API or something completely different to talk
to the backend. Also the local client storage for the state is something more specific.

Harmonized comes with a simple HTTP REST transporter and a generic IndexedDB client storage solution
(WIP) build in. But you are free to use any kind of transporter endpoint/protocol/API you like. As
long as your environment is supporting it, you can build your own Transporter/ClientStorage for it.
But maybe you want REST, but do something special there: just extend the existing HTTP Transporter
and add your logic to it. Or a simple middleware for the Transporter/ClientStorage is enough (e.g.
for adding a authentication header to your HTTP request, or modifying the state before you send it
to the backend or when receiving it)?

## Installation

when using npm do:
```
npm install git@github.com:Hypheme/harmonized.js.git --save
```

## First steps

First you need to create a `Store` with the corresponding `Schema` and additionally a `Transporter`
and/or `ClientStorage`. When not adding one of those, the `Store` will use a mock implementation
instead, so both are optional.

An basic person store that uses a `HttpTransporter` and a `IndexedDbStorage` (not available
yet) can be created like this:

```js
import { Store, HttpTransporter, Schema } from 'harmonized';
const personStore = new Store({
  schema: new Schema({
    firstName: String,
    lastName: String,
    age: Number,
  }),
  transporter: new HttpTransporter({
    baseUrl: 'https://www.hyphe.me/api',
    path: 'person',
  }),
  clientStorage: new IndexedDbStorage({
    // TODO: add options here when IndexedDbStorage is implemented
  }),
});
```

To create a new store you need to define a `Schema`. It defines the structure of your data. You can
find a deeper introduction into that further below. For now this simple example is enough to go on.

After you created the store, it will fetch everything from the backend and local database (and
initiates the local database if not there yet). To do something with the data, you need to wait for
it to be fetched. To do this, you use the `onceLoaded()` method of your created store, which returns
a promise. Then you can access the created items of the store:

```js
personStore.onceLoaded().then(() => {
  console.log('a list of all the people:');
  personStore.items.forEach((item) => {
    console.log('*', item.firstName, item.lastName, `(${item.age})`);
  });
  console.log('---------');
  console.log('total:', personStore.items.length);
}, (err) => console.log('Error fetching data!', err));
```

As you can see in the example above, you can access all the items through the `items` array of your
created store. It is just a plain array. You can access the properties of the items directly. When
being synced only the properties described in the schema will be listened to and transmitted. The
other properties will be ignored, the transporter and client storage won't get them.

You should not manipulate the items array by yourself, otherwise the store can't keep track of the
changes. To create a new item, you should use the `create()` method of the your store:

```js
const albert = personStore.create({
  firstName: 'Albert',
  lastName: 'Einstein',
  age: 32,
});
```

The newly created item will now be found in the `personStore.items` array.

If you want to fetch your data at a later point (maybe in some polling interval), you can use the
`fetch()` method. This will fetch the data from your transporter only (and updates the local
database when there are changes):

```js
personStore.fetch();
```

To update properties of an item, just edit these properties directly. When you are ready and want to
update the data on the local database and your backend, just use the `update()` method of the item:

```js
albert.age = 33;
albert.lastName = 'Einstein';
albert.update().then(() => {
  console.log('The item was updated');
});
```

To delete an item, you just have to use it's `delete()` method:

```js
albert.delete().then(() => {
  console.log('The item was successfully everywhere');
});
```

Gratulations! You created your first `Store` with client storage and a HTTP backend, created an
item, updated and deleted it. With this knowledge you can already build a simple app.

### The Schema

The Schema takes two arguments: An object that holds the actual data structure definition and an
optional lock flag. If the lock flag is set to `false`, you can add stuff to the schema after it's
creation. If it is `true` no changes can be made. The lock flag is `true` by default. Keep in mind,
that the Store can't be created when lock is still set to `false`.

The data structure object is loosely based on JSON schema. This way you can easily transform JSON
schema to a harmonized schema and can share one schema for backend and frontend to have a single
source of truth. In the schema you need to describe how your data is structured and what type the
properties have.

The most basic schema is one an empty model, it will look like this:

```js
import { Schema } from 'harmonized';
const schema = new Schema({});
```

Because your model is more complex than just a single value (it needs at lease a key property in
addition), the upper structural element is an `Object`. Objects have properties that need to be
described in the *properties* property:

```js
const schema = new Schema({
  type: Object,
  properties: {},
});
```

As you can see above, this object is described with it's type which is a direct reference to it's
container object. Because it is clear that the upper element is an `Object`, you can omit it.

Inside the `properties` property you describe the properties of the described `Object` with their
keys and types:

```js
const schema = new Schema({
  properties: {
    firstName: String,
    lastName: String,
    age: Number,
    isMarried: Boolean,
  },
})
```

The above example describes a simple model definition with key names defined by the property key and
the type as the value. The definition above is a shorthand for simple types. You can also write it
like this:

```js
const schema = new Schema({
  properties: {
    firstName: { type: String },
    lastName: { type: String },
    age: { type: Number },
    isMarried: { type: Boolean },
  },
});
```

You can also describe arrays and more deeply nested objects:

```js
const schema = new Schema({
  properties: {
    firstName: String,
    lastName: String,
    hobbies: {
      type: Array,
      items: String,
    },
    lifeEvents: {
      type: Object,
      properties: {
        birth: Number,
        firstTeeth: Number,
        firstKiss: {
          type: Object,
          properties: {
            year: Number,
            otherKisser: String,
          },
        },
      },
    },
  },
});
```

You can nest your data as deep as you like. Arrays need a `items` property that describes the type
of it's items. Arrays items only can be of one type.

Inside the upper object there needs to be a primary key definition. It has to be from the type `Key`
and needs three properties: `key`, `_key` and `primary`.

**key** describes the key name on the transporter side.

**_key** describes the key name on the client storage side (needs to be different from the
transporter key name)

**primary** defines if the key is primary. This needs to be `true`.

The actual key name of this key description is ignored (`key` and `_key` are used).

```js
import { Key } from 'harmonized';

const schema = new Schema({
  properties: {
    name: String,
    uuid: {
      type: Key,
      key: 'id',
      _key: '_id',
      primary: true,
    },
  },
});
```

In the example above the described key is a string key (like a hash). If you use number based IDs
you need to use the type `NumberKey` instead.

## under construction

We are currently developing harmonized. If you are interested, you can follow the development process at:

https://blog.hyphe.me/tag/harmonized/

If you want to contribute to the harmonized ecosystem by creating own Transporters, ClientStorages or middleware for those, then have a look in our [wiki](https://github.com/Hypheme/harmonized.js/wiki)

## License

MIT
