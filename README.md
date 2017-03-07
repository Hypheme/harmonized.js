[![Build Status](https://travis-ci.org/Hypheme/harmonized.js.svg?branch=master)](https://travis-ci.org/Hypheme/harmonized.js) [![codecov](https://codecov.io/gh/Hypheme/harmonized.js/branch/master/graph/badge.svg)](https://codecov.io/gh/Hypheme/harmonized.js) [![Dependency Status](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304) [![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)   

# harmonized.js

Offline first – state, storage and server manager (for react) based on MobX

## Why?

Being offline sucks! Your web app is not reachable. Or you accidentally closed the tab, and the state
is gone. The only thing left to do is to play the chrome offline T-Rex game.

![Bill Murray](https://media.giphy.com/media/Bzxeif0cR11ny/giphy.gif)

Here's when harmonized comes in. Use your web app offline – as if it was online!

### What harmonized can do for you

Harmonized is storing your state offline persistently and keeps it in sync with your backend. When
using a Progressive Web App offline, Harmonized serves the locally stored data, even when the
backend is unreachable. When being online, it speeds up display of the data, because the app can
display the local state before it receives the state from your backend. When receiving just updates
from the backend you can even keep network traffic at a minimum.

But it can do more: Be it a flaky internet connection or your backend having some issue. Your client
app will (almost) work like before. Creating or editing items of the state is no problem.
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

```JS
import { Store, HttpTransporter, Schema } from 'harmonized';
const peopleStore = new Store({
  schema: new Schema({
    firstName: String,
    lastName: String,
    age: Number,
  }),
  transporter: new HttpTransporter({
    baseUrl: 'https://www.hyphe.me/api',
    path: 'people',
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

```JS
peopleStore.onceLoaded().then(() => {
  console.log('a list of all the people:');
  peopleStore.items.forEach((item) => {
    console.log('*', item.firstName, item.lastName, `(${item.age})`);
  });
  console.log('---------');
  console.log('total:', peopleStore.items.length);
}, (err) => console.log('Error fetching data!', err));
```

As you can see in the example above, you can access all the items through the `items` array of your
created store. It is just a plain array. You can access the properties of the items directly. When
being synced only the properties described in the schema will be listened to and transmitted. The
other properties will be ignored, the transporter and client storage won't get them.

You should not manipulate the items array by yourself, otherwise the store can't keep track of the
changes. To create a new item, you should use the `create()` method of the your store:

```JS
const albert = peopleStore.create({
  firstName: 'Albert',
  lastName: 'Einstein',
  age: 32,
});
```

The newly created item will now be found in the `peopleStore.items` array.

If you want to fetch your data at a later point (maybe in some polling interval), you can use the
`fetch()` method. This will fetch the data from your transporter only (and updates the local
database when there are changes):

```JS
peopleStore.fetch();
```

To update properties of an item, just edit these properties directly. When you are ready and want to
update the data on the local database and your backend, just use the `update()` method of the item:

```JS
albert.age = 33;
albert.lastName = 'Einstein';
albert.update().then(() => {
  console.log('The item was updated');
});
```

To delete an item, you just have to use it's `delete()` method:

```JS
albert.delete().then(() => {
  console.log('The item was successfully everywhere');
});
```

Gratulations! You created your first `Store` with client storage and a HTTP backend, created an
item, updated and deleted it. With this knowledge you can already build a simple app.

## The Schema

With the `Schema` you describe the data structure of your store. It is basically needed to inform
the `Store` what data is available and what type the data has. In addition you will also define your
primary key and relations to other stores here.

The data structure object is loosely based on JSON schema. This way you can easily transform JSON
schema to a harmonized schema and can share one schema for backend and frontend to have a single
source of truth.

The most basic schema is one an empty model, it will look like this:

```JS
import { Schema } from 'harmonized';
const schema = new Schema({});
```

Because your model is more complex than just a single value, the upper structural element is an
`Object`. Objects have properties that need to be described in the *properties* property:

```JS
const schema = new Schema({
  type: Object,
  properties: {},
});
```

As you can see above, this object is described with it's type which is a direct reference to it's
container object. Because it is clear that the upper element is an `Object`, you can omit it.

Inside the `properties` property you describe the properties of the described `Object` with their
keys and types:

```JS
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

```JS
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

```JS
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

The actual key name of this key description is ignored if `primary` is `true` (`key` and `_key` are
used).

```JS
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

### Relations and references

All the examples above are little silos that don't have any relation to other resources, models or
stores. But you will most likely have at least one of those relations. A car has a driver and
multiple possible passengers. A book can reference other books for further reading. Or, like in the
example above, a person can have multiple hobbies. In the above example with the hobbies array we
have used simple strings as content of that array. But maybe you want to find people with the same
hobbies, and that is harder with just simple strings.

So you have an extra endpoint for hobbies. A full list of all hobbies with `GET /hobbies/` and a
single hobby with `GET /hobbies/123`. When receiving people with `GET /people/` you will return the
list of people, and each person holds a hobbies array with the ids of the hobbies the person has.
Lets say a person looks like this:

```JSON
{
  "firstName": "Albert",
  "lastName": "Einstein",
  "hobbies": [123, 422, 2, 530, 9001]
}
```

The hobby IDs refer to the IDs of the hobbies stored at your backend database.

Now when you pull these without relations in a simple `Store`, you will only see these backend IDs.
But what you want is to see the hobbies. You can change your backend to send the full hobbies
objects instead of just IDs. But then you will have multiple copies of that information inside many
person items. Also when editing a hobby information in the client, this information won't be updated
directly in the person objects without fetching them again.

So, how to solve this? You need to describe the relations between your *people* and your *hobbies*
store. For this you first need to have two stores:

```JS
import {
  Store,
  HttpTransporter,
  IndexedDbStorage,
  Schema,
  NumberKey,
} from 'harmonized';

const baseUrl = 'https://www.hyphe.me/api';

const hobbiesSchema = new Schema({
  properties: {
    name: String,
    type: String,
    difficulty: Number,
    id: {
      type: NumberKey,
      key: 'id',
      _key: '_id',
      primary: true,
    },
  },
});

const hobbiesStore = new Store({
  schema: peopleSchema,
  transporter: new HttpTransporter({
    baseUrl,
    path: 'hobbies',
  }),
  clientStorage: new IndexedDbStorage({/* some options */}),
});

const peopleSchema = new Schema({
  properties: {
    firstName: String,
    lastName: String,
    hobbies: {
      type: Array,
      items: Number,
    },
    id: {
      type: NumberKey,
      key: 'id',
      _key: '_id',
      primary: true,
    },
  },
});

const peopleStore = new Store({
  schema: peopleSchema,
  transporter: new HttpTransporter({
    baseUrl,
    path: 'people',
  }),
  clientStorage: new IndexedDbStorage({/* some options */}),
});
```

As you see we still have a hobbies array with `Number` items in the people schema. Now we want to
change that. So, what do we need for that?

* The name of the property in your person item (in this case `hobbies`)
* The keys of the hobbies store of the backend and the local database
* The actual store, where to find the hobbies referenced

With all this in mind, let's change the people schema:

```JS
const peopleSchema = new Schema({
  properties: {
    // ...
    hobbies: {
      type: Array,
      items: {
        type: NumberKey,
        key: 'id',
        key: '_id',
        ref: hobbiesStore,
      },
    },
    // ...
  },
});
```

// COMMENT: is key really needed? Should we make the key definable for everything so you can have
different names for state, API, local DB? The key in the hobbies schema is already known.

Now we have a `NumberKey` type instead of a `Number` type. We defined the keys of the hobbies, and
we now have added a `ref` property that holds a reference to the store, where to get the hobbies
items.

Now when we fetch people from the backend, the backend IDs will automatically be replaced with the
hobbies `Item` objects. When certain hobby items are not fetched yet, they will be fetched
automatically. Also the promise of the `peopleStore.onceLoaded()` method only will be resolve when
all item relations are also resolved, so you can be certain that you have everything available when
you access your items inside the `then()` callback.

If you have one to one relations you can define it the same way in the schema:
```JS
const peopleSchema = new Schema({
  properties: {
    // ...
    spouse: {
      type: NumberKey,
      key: 'id',
      key: '_id',
      ref: spouseStore,
    },
    // ...
  },
});
```

// COMMENT: we need a self reference!!! Maybe with `this`?

Currently self referencing is not working, but that is a thing we will definitely add in the near
future.

Now when you access a single the reference item (like a hobby inside a person), you can handle them
like the items in the reference store (hobby store in this example). So you can update them and even
delete them from the hobbies list. Harmonized automatically detects items that you put inside a
reference property. That means, when you are adding a hobby item from the hobbies store to the
hobbies array of a person, it will automatically be transformed to the corresponding IDs of the
backend and the local database, when the data is synced. Here is an example how to work with
references when manipulating your items:

```JS
// Get the Albert Einstein people item
const albert = peopleStore.findOne({
  firstName: 'Albert',
  lastName: 'Einstein',
});

// Get the science hobby
const scienceHobby = hobbiesStore.findOne({
  name: 'Science',
});

// Add the science hobby to Alberts hobby list
albert.hobbies.push(scienceHobby);

// Find and set Alberts spouse
albert.spouse = spouseStore.findOne({
  firstName: 'Mileva',
  lastName: 'Marić',
});

// sync the albert state with the local db and the backend
albert.update();
```

It is also easy to change and update the data of relation:

```JS
const steve = peopleStore.findOne({
  firstName: 'Steve',
  lastName: 'Jobs',
});

const stevesSpouse = spouseStore.findOne({
  firstName: 'Laurene',
  lastName: 'Powell',
});

// Steve's spouse's spouse wasn't set.
// So we need to update this and change it to steve
steve.spouse.spouse = steve;
steve.spouse.update();

// This returns true, because it references the same object
console.log(steve.spouse === stevesSpouse);
```

That's it! Now you are a pro at defining references to other stores and working with this
references. Wasn't that hard, right?

## Adding middleware to transporters and client storages

Every backend API is different! Sometimes the structure in your backend completely differs from what
you want to display in the frontend. Sometimes you want to send special headers (the most used
case for this is probably the authentication header). Or you want to keep track of the
client-server-time drift.

For this you can use transporter and client storage middleware. With middleware you can:

* read/manipulate the body and request of received requests before they hit the store
* read/manipulate the body and request metadata of requests before they are are sent
* catch transmission errors (like a 500 or 404 HTTP response or failed connection) and handle them

To add middleware to a transporter, you need to use the static `add()` method of the corresponding
Transporter or ClientStorage class:

```JS
HttpTransporter.add(new MyAwesomeHttpMiddleware('some', 'configuration'));
```

This middleware will apply to all created instances of the HttpTransporter.

So how do we write our own middleware you ask? Let's have a look how to create a simple auth header
middleware for the HttpTransporter:

```JS
import {
  TransporterMiddleware,
  HttpTransporter,
} from 'harmonized';

class MyAuthHttpMiddleware extends TransporterMiddleware {
  constructor(authTokenKey, refreshTokenKey) {
    // You can add configuration possibilities for your middleware in the constructor
    this.authToken = localStorage.get(authTokenKey);
    this.refreshToken = localStorage.get(refreshTokenKey);
  }

  send(req) {
    // Add the token to the 'Authentication' header
    req.headers['Authentication'] = `Bearer ${authToken}`;
    return req;
  }

  transmissionError({res}) {
    // When unauthorized token is returned, refresh the token
    if (res.status === 401) {
      return this.refreshToken();
    }

    return res;
  }

  refreshToken() {
    // refresh logic
  }
}

MyAuthHttpMiddleware.uniqueName = 'my-auth-middleware';

// Add the your middleware to the HttpTransporter
HttpTransporter.add(new MyAuthHttpMiddleware('authToken', 'refreshToken'));
```

## Further documentation

You can find more API documentation here:
// TODO: create API documentation

## under construction

We are currently developing harmonized. If you are interested, you can follow the development process at:

https://blog.hyphe.me/tag/harmonized/

If you want to contribute to the harmonized ecosystem by creating own Transporters, ClientStorages or middleware for those, then have a look in our [wiki](https://github.com/Hypheme/harmonized.js/wiki)

## License

MIT
