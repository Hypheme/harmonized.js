[![Build Status](https://travis-ci.org/Hypheme/harmonized.js.svg?branch=master)](https://travis-ci.org/Hypheme/harmonized.js) [![codecov](https://codecov.io/gh/Hypheme/harmonized.js/branch/master/graph/badge.svg)](https://codecov.io/gh/Hypheme/harmonized.js) [![Dependency Status](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304/badge.svg?style=flat-square)](https://www.versioneye.com/user/projects/58341e7b4ef164003ff45304) [![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php)   

# harmonized.js

Offline first – state, storage and server manager (optimized for react) based on MobX

## Installation

when using npm do:
```
npm install git@github.com:Hypheme/harmonized.js.git --save
```

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

Sometimes you want to do something fancy that we haven't added to harmonized (like adding a
authentication header to your HTTP request, or modifying the state before you send it to the backend
or when receiving it). For this, you can add middleware to a `Transporter` or `ClientStorage`.

## Modularity

Harmonized is build with modularity in mind. We know that every backend is a little different, maybe
not using a REST HTTP API, but WebSockets, JSON Pure API or something completely different to talk
to the backend. Also the local client storage for the state is something more specific.

Harmonized comes with a simple HTTP REST transporter and a generic IndexedDB client storage solution
(WIP) build in. But you are free to use any kind of transporter endpoint/protocol/API you like. As
long as your environment is supporting it, you can build your own Transporter/ClientStorage for it.
But maybe you want REST, but do something special there: just extend the existing HTTP Transporter
and add your logic to it. Or a simple middleware for the Transporter/ClientStorage is enough?

## under construction

We are currently developing harmonized. If you are interested, you can follow the development process at:

https://blog.hyphe.me/tag/harmonized/

If you want to contribute to the harmonized ecosystem by creating own Transporters, ClientStorages or middleware for those, then have a look in our [wiki](https://github.com/Hypheme/harmonized.js/wiki)

## License

MIT
