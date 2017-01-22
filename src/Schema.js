// @flow
import { extendObservable } from 'mobx';
import _ from 'lodash';
import Item from './Item';
import { SOURCE, TARGET } from './constants';

type DataSource = SOURCE.STATE|SOURCE.TRANSPORTER|SOURCE.CLIENT_STORAGE;
type DataTarget = TARGET.TRANSPORTER|TARGET.CLIENT_STORAGE;

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

  getKeyIdentifierFor(target: DataTarget) {
    if (target === TARGET.TRANSPORTER) {
      return this.primaryKey.key;
    }

    if (target === TARGET.CLIENT_STORAGE) {
      return this.primaryKey._key;
    }
  }

  getObservables(item: Object) {
    const keys = this.observables.concat(Array.from(this.references.keys()));
    return keys.map(key => _.get(item, key));
  }


  lock() {
    this._isLocked = true;
  }

  setPrimaryKey(source: DataSource, item: Object, data: Object) {
    let prefix;
    if (source === SOURCE.CLIENT_STORAGE) {
      prefix = '_';
    } else if (source === SOURCE.TRANSPORTER) {
      prefix = '';
    } else {
      throw new Error('unsupported source');
    }

    const key = this._primaryKey[`${prefix}key`];
    const dataKey = data[key];
    const itemKey = item[key];
    if (dataKey !== undefined && itemKey === undefined) {
      item[key] = dataKey;
    }
  }

  _setFromState(item: Object, data: Object, options: Object): Promise {
    const { allObservables, filteredData } = this._getPickedData(data);

    Schema._mergeFromSet({ item, filteredData, options }, allObservables);
    return Promise.resolve(item);
  }

  setFrom(source: DataSource, item: Item, data: Object, options = {}): Promise {
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
    Object.keys(observables).forEach((key) => {
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
      .filter(key => !Schema.isPrimaryKey(definition.properties[key]))
      .forEach((key) => {
        const property = definition.properties[key];
        if (property.type !== Object) {
          if (property.observable === false) {
            this.nonObservables.push(`${parentPath}${key}`);
          } else if (
            Schema.isKey(property) ||
            (property.type === Array && Schema.isKey(property.items))
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
    options: Object,
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

  _setForeignValues(item: Item, data: Object, prefix: string, options: Object) {
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
        const oldAutosaveValue = item.autoSave;
        item.autoSave = false;

        if (options.establishObservables) {
          Schema.extendObservable(item, refOptions.propertyKey, []);
        } else {
          refOptions.parentObj[refOptions.propertyKey] = [];
        }

        item.autoSave = oldAutosaveValue;
        promises = promises.concat(thisValue.map(
          (foreignKey, index) => Schema._resolveForeignValues(refOptions, foreignKey, item, index)),
        );
      } else {
        promises.push(Schema._resolveForeignValues(refOptions, thisValue, item));
      }
    });

    return promises;
  }

  _setFromOutside(
    keyPrefix: string,
    item: Item,
    data: Object,
    options: Object,
  ): Promise {
    const { observables, filteredData } = this._getPickedData(data);
    Schema._mergeFromSet({ item, filteredData, options }, observables);
    const promises = this._setForeignValues(item, data, keyPrefix, options);
    return Promise.all(promises).then(() => item);
  }

  static _mergeFromSet({ item, filteredData, options }, observables) {
    const { establishObservables } = options;
    const oldAutosaveValue = item.autoSave;
    item.autoSave = false;
    _.merge(item, filteredData);
    if (establishObservables) {
      Schema.setAsObservables(item, observables);
    }

    item.autoSave = oldAutosaveValue;
  }

  static _resolveForeignValues(
    { definition, key, propertyKey, parentObj, options },
    foreignKey: string|Number,
    item: Item,
    index: ?Number,
  ): Promise {
    const ref = (definition.items) ? definition.items.ref : definition.ref;
    return ref.onceLoaded().then(() => {
      const resolver = {};
      resolver[key] = foreignKey;
      const newValue = ref.findOne(resolver);

      const oldAutosaveValue = item.autoSave;
      item.autoSave = false;
      if (options.establishObservables && index === undefined) {
        Schema.extendObservable(parentObj, propertyKey, newValue);
      } else if (index === undefined) {
        parentObj[propertyKey] = newValue;
      } else {
        parentObj[propertyKey][index] = newValue;
      }

      item.autoSave = oldAutosaveValue;
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
          break;
        case Object:
          Schema._normalizeDefinition(property);
          break;
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

  _resolveFor(target: DataTarget, item: Item): Promise {
    const { references } = this._getPickedData(item);
    const unresolvedReferences = [];
    this.references.forEach((value, key) => {
      const ref = _.get(references, key);
      if (_.isArray(ref)) {
        ref
          .filter(refItem => !refItem.isReadyFor(target))
          .reduce((referenceList, refItem) => {
            referenceList.push(refItem.onceReadyFor(target));
            return referenceList;
          }, unresolvedReferences);
      } else if (!ref.isReadyFor(target)) {
        unresolvedReferences.push(ref.onceReadyFor(target));
      }
    });

    if (unresolvedReferences.length > 0) {
      return Promise.all(unresolvedReferences)
        .then(() => this._resolveFor(target, references));
    }

    return Promise.resolve();
  }

  getFor(target: DataTarget, item: Item, initialData: Object = {}): Promise {
    const prefix = target === TARGET.CLIENT_STORAGE ? '_' : '';

    return this._resolveFor(target, item).then(() => {
      const { references, filteredData } = this._getPickedData(item);
      const convertedReferences = {};
      this.references.forEach((value, key) => {
        const ref = _.get(references, key);
        if (_.isArray(ref)) {
          const refKeyArray = ref.map(refItem => refItem[value.items[`${prefix}key`]]);
          _.set(convertedReferences, key, refKeyArray);
        } else {
          _.set(convertedReferences, key, ref[value[`${prefix}key`]]);
        }
      });

      return _.merge({}, filteredData, initialData, convertedReferences);
    });
  }

  getPrimaryKey(source: DataSource, item: Item): Object {
    let key;
    if (source === TARGET.CLIENT_STORAGE) {
      key = this._primaryKey._key;
    } else {
      key = this._primaryKey.key;
    }

    return {
      [key]: item[key],
    };
  }
}

export default Schema;
export { Key, NumberKey } ;
