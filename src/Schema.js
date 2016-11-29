class Schema {
  // constructor(definition) {
  // }

  // mobx observables
  // hits all observables once. Needed for mobx
  // THIS HAS TO BE SYNCHRONOUS, no promise pls
  getObservables(/* item */) {}
  // note: this needs to be nested now as well as keys in state view need to be observables as well
  // _stateHandlerTrigger() {
  //   // this._store.schema.observables.forEach(key => {
  //   this._store.itemKeys.forEach(key => {
  //     if (typeof key === 'string') {
  //       return this[key];
  //     }
  //     return this[key.name];
  //   });
  // }

  // populate the given item with the given data
  // all return promises
  // set the primary keys (both transporter and client) Once a key is set
  // it shall never be overwritten again
  setPrimaryKey(/* item, data */) {}
  // set everything except primary keys:
  // item: item in which the data is written
  // data: the data to write
  // (optional) establishObservables: boolean, if set to true,
  // mobx observers have to be established as well
  // you do that with extendObservable
  // https://mobxjs.github.io/mobx/refguide/extend-observable.html
  setFromState(/* item, data, {establishObservables:false}*/) {}
  setFromTransporter(/* item, data, {establishObservables:false}*/) {}
  setFromClientStorage(/* item, data, {establishObservables:false}*/) {}
  // below is the old code for this.
  //   _setPrimaryKey(givenKeys) {
  // ONLY ONE PRIMARY KEY from now
  //   this._store.itemKeys.forEach(key => {
  //     if (key.primary === true) {
  //       this[key.key] = this[key.key] || givenKeys[key.key];
  //       this[key._key] = this[key._key] || givenKeys[key._key];
  //     }
  //   });
  // }
  // _setFromOutside(values, prefix = '') {
  //   const promises = [];
  //   // this._store.schema.entries.forEach(key => {
  //   this._store.itemKeys.forEach(key => {
  //     if (typeof key === 'string') {
  //       this[key] = values[key];
  //     } else if (key.store === undefined) { // depcecated, we dont set primary keys here any more
  //       this._setPrimaryKey(values);
  //     } else {
  //       const resolver = {};
  //       resolver[key[`${prefix}storeKey`]] = values[key[`${prefix}relationKey`]];
  //       // TODO add internal stores to the mix (hurray)
  //       promises.push(key.store.onceLoaded() // this is tricky.
  //            // You have to wait for the foreign store to load before you can start searching
  //         .then(() => {
  //           this[key.name] = key.store.findOne(resolver);
  //         }));
  //     }
  //   });
  //   return Promise.all(promises);
  // }
  // _setFromState(values) {
  //   // this._store.schema.entries.forEach(key => {
  //   this._store.itemKeys.forEach(key => {
  //     if (typeof key === 'string') {
  //       this[key] = values[key];
  //     } else if (key.store === undefined) {
  //       this._setPrimaryKey(values);
  //       // TODO: internal relations
  //     // } else if(typeof key.store === 'function') {
  //     //   this[key.name] = new key.store(values[key.name]);
  //     } else {
  //       this[key.name] = values[key.name];
  //     }
  //   });
  //   return Promise.resolve();
  // }
  //

  // TODO getForState(item){}
  // getForTransporter(item){}
  // getForLocalStorage(item){}
  // getPrimaryKey(item){}
}

// doesn't need any logic for now. Is used to determine keys in schema setup
class Key {}

export default Schema;
export { Key } ;
