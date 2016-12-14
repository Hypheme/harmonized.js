// @flow
import { extendObservable } from 'mobx';
import _ from 'lodash';

// doesn't need any logic for now. Is used to determine keys in schema setup
class Key {}
class NumberKey {}

class Schema {
  _definition: Object;
  _primaryKey: Object;
  observables: Array<string>;
  nonObservables: Array<string>;
  _isLocked: boolean;

  constructor(definition: Object, lock: boolean = true) {
    this.observables = [];
    this.nonObservables = [];
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

    this._createObservableKeyList(this._definition);

    this._isLocked = lock;
  }

  lock() {
    this._isLocked = true;
  }

  _createObservableKeyList(definition: Object, parentPath : string = '') {
    if (!_.isPlainObject(definition.properties)) return;

    Object.keys(definition.properties)
      .filter((key) => !Schema.isKey(definition.properties[key]))
      .forEach((key) => {
        const property = definition.properties[key];
        if (property.type !== Object) {
          if (property.observable === false) {
            this.nonObservables.push(`${parentPath}${key}`);
          } else {
            this.observables.push(`${parentPath}${key}`);
          }
          return;
        }

        const newParentPath = `${parentPath}${key}.`;
        this._createObservableKeyList(property, newParentPath);
      });
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
    }
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

  getObservables(item: Object) {
    return this.observables.map(key => _.get(item, key));
  }

  setPrimaryKey(item: Object, data: Object) {
    this._setKeyIfUndefined('', item, data);
    this._setKeyIfUndefined('_', item, data);
  }

  _setKeyIfUndefined(prefix: string, item: Object, data: Object) {
    const key = this._primaryKey[`${prefix}key`];
    const dataKey = data[key];
    const itemKey = item[key];
    if (dataKey !== undefined && itemKey === undefined) {
      item[key] = dataKey;
    }
  }

  static setAsObservables(item, observables) {
    Object.keys(observables).forEach(key => {
      const obsValue = observables[key];
      if (!_.isPlainObject(obsValue)) {
        const extendObj = {};
        extendObj[key] = obsValue;
        extendObservable(item, extendObj);
      } else {
        Schema.setAsObservables(item[key], obsValue);
      }
    });
  }

  setFromState(item: Object, data: Object, establishObservables: boolean) {
    const observables = _.pick(data, this.observables);
    const nonObservables = _.pick(data, this.nonObservables);
    const filteredData = _.merge({}, observables, nonObservables);
    _.merge(item, filteredData);
    if (establishObservables) {
      Schema.setAsObservables(item, observables);
    }

    return Promise.resolve(item);
  }

  // set everything except primary keys:
  // item: item in which the data is written
  // data: the data to write
  // (optional) establishObservables: boolean, if set to true,
  // mobx observers have to be established as well
  // you do that with extendObservable
  // https://mobxjs.github.io/mobx/refguide/extend-observable.html
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

  // getForState(item){} // least important one, not even sure if needed

  /**
   * gets all data for the transporter except for the primary key
   * (an item can't have a key until its created in the transporter for example )
   * has to wait until all foreing keys are created. (this is tricky,
   * pls aks johannes before implementing).
   *
   * initialData is an object with data, that has to be in the result as well
   */
  // getForTransporter(item, initialData){}
  /**
   * same as getForTransporter but for the clientStorage
   */
  // getForClientStorage(item, initialData){}
  /**
   * gets the transporter primary key. The function is only called when the key
   * already exists, so this should be sync. returns { <key_name> : <key_value> }
   */
  // getPrimaryKeyForTransporter(item) {}
  /**
   * same as getPrimaryKeyForTransporter but for clientStorage
   */
  // getPrimaryKeyForClientStorage(item) {}
}

export default Schema;
export { Key, NumberKey } ;
