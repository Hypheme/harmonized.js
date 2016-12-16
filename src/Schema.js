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
  references: Map<string, Object>;
  _isLocked: boolean;

  constructor(definition: Object, lock: boolean = true) {
    this.observables = [];
    this.nonObservables = [];
    this.references = new Map();
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
      .filter((key) => !Schema.isPrimaryKey(definition.properties[key]))
      .forEach((key) => {
        const property = definition.properties[key];
        if (property.type !== Object) {
          if (property.observable === false) {
            this.nonObservables.push(`${parentPath}${key}`);
          } else if (
            Schema.isKey(property) ||
            property.type === Array && Schema.isKey(property.items)
          ) {
            this.references.set(`${parentPath}${key}`, property);
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

  static isPrimaryKey(property) {
    return Schema.isKey(property) && property.primary;
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

  getObservables(item: Object) {
    const keys = this.observables.concat(Array.from(this.references.keys()));
    return keys.map(key => _.get(item, key));
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

  setFromState(item: Object, data: Object, establishObservables: boolean): Promise {
    const { allObservables, filteredData } = this._getPickedData(data);
    Schema._mergeFromSet({ item, filteredData, establishObservables }, allObservables);
    return Promise.resolve(item);
  }

  _getPickedData(data: Object) {
    const observables = _.pick(data, this.observables);
    const references = _.pick(data, Array.from(this.references.keys()));
    const nonObservables = _.pick(data, this.nonObservables);

    // IDEA: Check if picking from concatinated array is cheaper
    const allObservables = _.merge({}, observables, references);
    const filteredData = _.merge({}, allObservables, nonObservables);

    return { observables, nonObservables, filteredData, allObservables, references };
  }

  static _mergeFromSet({ item, filteredData, establishObservables }, observables) {
    _.merge(item, filteredData);
    if (establishObservables) {
      Schema.setAsObservables(item, observables);
    }
  }

  static _resolveForeignValues(
    { definition, key, propertyKey, parentObj, extendFn },
    foreignKey: string|Number
  ): Promise {
    return definition.ref.onceLoaded().then(() => {
      const resolver = {};
      resolver[key] = foreignKey;
      const newContent = {};
      newContent[propertyKey] = definition.ref.findOne(resolver);
      extendFn(parentObj, newContent);
    });
  }

  _setForeignValues(item: Object, data: Object, prefix: string, extendFn: Function) {
    let promises:Array<Promise> = [];

    this.references.forEach((definition, path) => {
      const lastDotIndex = path.lastIndexOf('.');
      const options: Object = {
        extendFn,
        key: definition[`${prefix}key`],
        parentPath: path.substr(0, lastDotIndex),
        propertyKey: path.substr(lastDotIndex),
      };

      // Create parent path in if not there yet
      options.parentObj = _.get(item, options.parentPath);
      if (options.parentObj === undefined) {
        options.parentObj = {};
        _.set(item, options.parentPath, options.parentObj);
      }

      const thisValue = _.get(data, path);

      if (definition.type === Array) {
        promises = promises.concat(thisValue.map(
          foreignKey => Schema._resolveForeignValues(options, foreignKey))
        );
      } else {
        promises.push(Schema._resolveForeignValues(options, thisValue));
      }
    });

    return promises;
  }

  _setFromOutside(
    keyPrefix: string,
    item: Object,
    data: Object,
    establishObservables: boolean
  ): Promise {
    const { observables, filteredData } = this._getPickedData(data);
    Schema._mergeFromSet({ item, filteredData, establishObservables }, observables);

    const promises = [];
    const extendFn = establishObservables ? extendObservable : Object.assign;
    promises.concat(this._setForeignValues(item, data, keyPrefix, extendFn));
    return Promise.all(promises).then(() => item);
  }

  setFromTransporter(item: Object, data: Object, establishObservables: boolean): Promise {
    return this._setFromOutside('', item, data, establishObservables);
  }

  setFromClientStorage(item: Object, data: Object, establishObservables: boolean): Promise {
    return this._setFromOutside('_', item, data, establishObservables);
  }

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
