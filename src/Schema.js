// @flow
import { extendObservable } from 'mobx';
import _ from 'lodash';
import { SOURCE } from './constants';

type DataSource = SOURCE.STATE|SOURCE.TRANSPORTER|SOURCE.CLIENT_STORAGE;

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

  getObservables(item: Object) {
    const keys = this.observables.concat(Array.from(this.references.keys()));
    return keys.map(key => _.get(item, key));
  }

  lock() {
    this._isLocked = true;
  }

  setPrimaryKey(item: Object, data: Object) {
    this._setKeyIfUndefined('', item, data);
    this._setKeyIfUndefined('_', item, data);
  }

  _setFromState(item: Object, data: Object, options: Object): Promise {
    const { allObservables, filteredData } = this._getPickedData(data);

    Schema._mergeFromSet({ item, filteredData, options }, allObservables);
    return Promise.resolve(item);
  }

  setFrom(source: DataSource, item: Object, data: Object, options = {}): Promise {
    switch (source) {
      case SOURCE.TRANSPORTER:
        return this._setFromOutside('', item, data, options);
      case SOURCE.CLIENT_STORAGE:
        return this._setFromOutside('_', item, data, options);
      case SOURCE.STATE:
        return this._setFromState(item, data, options);
      default:
        throw new Error('source type is not known');
    }
  }

  static extendObservable(item, key, value) {
    const extendObj = {};
    extendObj[key] = value;
    extendObservable(item, extendObj);
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

  static isPrimaryKey(property) {
    return Schema.isKey(property) && property.primary;
  }

  static setAsObservables(item, observables) {
    Object.keys(observables).forEach(key => {
      const obsValue = observables[key];
      if (!_.isPlainObject(obsValue)) {
        Schema.extendObservable(item, key, obsValue);
      } else {
        Schema.setAsObservables(item[key], obsValue);
      }
    });
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

  _getPickedData(data: Object) {
    const observables = _.pick(data, this.observables);
    const references = _.pick(data, Array.from(this.references.keys()));
    const nonObservables = _.pick(data, this.nonObservables);

    // IDEA: Check if picking from concatinated array is cheaper
    const allObservables = _.merge({}, observables, references);
    const filteredData = _.merge({}, observables, nonObservables);

    return { observables, nonObservables, filteredData, allObservables, references };
  }

  _createReferenceOptions(
    definition: Object,
    path: string,
    item: Object,
    prefix: string,
    options: Object
  ) {
    const def = definition.type === Array ? definition.items : definition;
    const refOptions: Object = {
      definition,
      options,
      key: def[`${prefix}key`],
    };

    // Create parent path in if not there yet
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const parentPath = path.substr(0, lastDotIndex);
      refOptions.propertyKey = path.substr(lastDotIndex + 1);
      refOptions.parentObj = _.get(item, parentPath);
      if (refOptions.parentObj === undefined) {
        refOptions.parentObj = {};
        _.set(item, parentPath, refOptions.parentObj);
      }
    } else {
      refOptions.parentObj = item;
      refOptions.parentPath = '';
      refOptions.propertyKey = path;
    }

    return refOptions;
  }

  _setForeignValues(item: Object, data: Object, prefix: string, options: Object) {
    let promises:Array<Promise> = [];
    this.references.forEach((definition, path) => {
      const thisValue = _.get(data, path);
      if (!thisValue) return;

      const refOptions = this._createReferenceOptions(
        definition,
        path,
        item,
        prefix,
        options,
      );

      if (definition.type === Array) {
        if (options.establishObservables) {
          Schema.extendObservable(item, refOptions.propertyKey, []);
        } else {
          refOptions.parentObj[refOptions.propertyKey] = [];
        }

        promises = promises.concat(thisValue.map(
          (foreignKey, index) => Schema._resolveForeignValues(refOptions, foreignKey, index))
        );
      } else {
        promises.push(Schema._resolveForeignValues(refOptions, thisValue));
      }
    });

    return promises;
  }

  _setFromOutside(
    keyPrefix: string,
    item: Object,
    data: Object,
    options: Object
  ): Promise {
    const { observables, filteredData } = this._getPickedData(data);
    Schema._mergeFromSet({ item, filteredData, options }, observables);
    const promises = this._setForeignValues(item, data, keyPrefix, options);
    return Promise.all(promises).then(() => item);
  }

  _setKeyIfUndefined(prefix: string, item: Object, data: Object) {
    const key = this._primaryKey[`${prefix}key`];
    const dataKey = data[key];
    const itemKey = item[key];
    if (dataKey !== undefined && itemKey === undefined) {
      item[key] = dataKey;
    }
  }

  static _mergeFromSet({ item, filteredData, options }, observables) {
    const { establishObservables } = options;
    _.merge(item, filteredData);
    if (establishObservables) {
      Schema.setAsObservables(item, observables);
    }
  }

  static _resolveForeignValues(
    { definition, key, propertyKey, parentObj, options },
    foreignKey: string|Number,
    index: ?Number
  ): Promise {
    const ref = (definition.items) ? definition.items.ref : definition.ref;
    return ref.onceLoaded().then(() => {
      const resolver = {};
      resolver[key] = foreignKey;
      const newValue = ref.findOne(resolver);
      if (options.establishObservables && index === undefined) {
        Schema.extendObservable(parentObj, propertyKey, newValue);
      } else if (index === undefined) {
        parentObj[propertyKey] = newValue;
      } else {
        parentObj[propertyKey][index] = newValue;
      }
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
