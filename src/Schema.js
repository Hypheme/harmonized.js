// @flow
import _ from 'lodash';

// doesn't need any logic for now. Is used to determine keys in schema setup
class Key {}
class NumberKey {}

class Schema {
  _definition: Object;
  _primaryKey: Object;
  _isLocked: boolean;

  constructor(definition: Object, lock: boolean = true) {
    this._definition = _.cloneDeep(definition);
    Schema._normalizeDefinition(this._definition);

    // Check for available primary key
    const properties = this._definition.properties;
    Object.keys(properties).forEach((key) => {
      const property = properties[key];
      if (Schema.isKey(property) && property.primary) {
        this._primaryKey = property;
      }
    });

    // If not available add default one
    if (!this._primaryKey) {
      this._primaryKey = properties.id = {
        type: Key,
        key: 'id',
        _key: '_id',
        primary: true,
      };
    }

    this._isLocked = lock;
  }

  static _normalizeDefinition(definition) {
    if (!_.isPlainObject(definition.properties)) return;

    const properties = definition.properties;
    _.forEach(properties, (property, key) => {
      if (!_.isPlainObject(property)) {
        properties[key] = {
          type: property,
        };
        return;
      }

      switch (property.type) {
        case Key:
          Schema._transformKeyFunctions(property);
          return;
        case Array:
          Schema._transformArrayType(property);
          return;
        case Object:
          Schema._normalizeDefinition(property);
          return;
        default:
          return;
      }
    });
  }

  static _transformArrayType(property) {
    if (!_.isPlainObject(property.items)) {
      property.items = {
        type: property.items,
      };
    } else {
      this._transformKeyFunctions(property.items);
    }
  }

  static _transformKeyFunctions(property) {
    if (_.isString(property.key)) {
      property.key = (item) => item[property.key];
    }

    if (_.isString(property._key)) {
      property._key = (item) => item[property._key];
    }
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

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
  setPrimaryKey(item: Object, data: Object) {
    // TODO make this async, but why/how?
    const key = this._primaryKey.key;
    const _key = this._primaryKey._key;
    Schema._setKeyIfUndefined(key, item, data);
    Schema._setKeyIfUndefined(_key, item, data);
  }

  static _setKeyIfUndefined(key: string, item: Object, data: Object) {
    if (data[key] !== undefined && item[key] === undefined) {
      data[key] = item[key];
    }
  }

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

export default Schema;
export { Key, NumberKey } ;
