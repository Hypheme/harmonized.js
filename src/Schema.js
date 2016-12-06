// @flow
import _ from 'lodash';

// doesn't need any logic for now. Is used to determine keys in schema setup
class Key {}
class NumberKey {}

class Schema {
  _definition: Object;
  _primaryKey: Object;
  observables: Object;
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
        getKey: (item) => item.id,
        _getKey: (item) => item._id,
        setKey: (item, key) => { item.id = key; },
        _setKey: (item, key) => { item._id = key; },
        primary: true,
      };
    }

    // Handle observables mirror
    this.observables = Schema._createObservablesObj(this._definition);

    this._isLocked = lock;
  }

  lock() {
    this._isLocked = true;
  }

  static _createObservablesObj(definition): Object {
    const observablesObj = {};
    if (!_.isPlainObject(definition.properties)) return observablesObj;

    Object.keys(definition.properties)
      .map((key) => ({ property: definition.properties[key], key }))
      .filter(({ property }) => property.observable !== false)
      .forEach(({ key, property }) => {
        if (property.type !== Object) {
          observablesObj[key] = true;
        } else {
          observablesObj[key] = Schema._createObservablesObj(property);
        }
      });

    return observablesObj;
  }

  static _normalizeDefinition(definition: Object) {
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
    if (property.key) {
      property.getKey = (item) => item[property.key];
      property.setKey = (item, value) => { item[property.key] = value; };
    }

    if (property._key) {
      property._getKey = (item) => item[property._key];
      property._setKey = (item, value) => { item[property._key] = value; };
    }
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

  getObservables(item: Object) {
    Schema._getObservables(item, this.observables);
  }

  static _getObservables(item, observables) {
    _.forEach(observables, (value, key) => {
      if (_.isObject(value)) {
        return Schema._getObservables(item[key], observables[key]);
      }

      return item[key];
    });
  }

  setPrimaryKey(item: Object, data: Object) {
    this._setKeyIfUndefined('', item, data);
    this._setKeyIfUndefined('_', item, data);
  }

  _setKeyIfUndefined(prefix: string, item: Object, data: Object) {
    const getKey = this._primaryKey[`${prefix}getKey`];
    const dataKey = getKey(data);
    const itemKey = getKey(item);
    if (dataKey !== undefined && itemKey === undefined) {
      const setKey = this._primaryKey[`${prefix}setKey`];
      setKey(item, dataKey);
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
