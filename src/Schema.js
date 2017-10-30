// @flow
import { observable } from 'mobx';
import set from 'lodash/set';
import get from 'lodash/get';
import merge from 'lodash/merge';
import pick from 'lodash/pick';
import isPlainObject from 'lodash/isPlainObject';
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
    this._definition = Schema._buildNormalizedDefinition(definition);

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
      this._primaryKey = {
        type: Key,
        key: 'id',
        _key: '_id',
        primary: true,
      };
      properties.id = this._primaryKey;
    }

    this._createObservableKeyList(this._definition);

    this._isLocked = lock;
  }

  getKeyIdentifierFor(target: DataTarget) {
    if (target === TARGET.TRANSPORTER) {
      return this._primaryKey.key;
    }

    if (target === TARGET.CLIENT_STORAGE) {
      return this._primaryKey._key;
    }

    throw new Error('unsupported target for getKeyIdentifierFor');
  }

  getObservables(item: Object) {
    const keys = this.observables.concat(Array.from(this.references.keys()));
    return keys.map(key => get(item, key));
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

  _setFromState(item: Object, data: Object): Promise {
    const { allObservables, filteredData } = this._getPickedData(data);

    Schema._mergeFromSet({ item, filteredData }, allObservables);
    return Promise.resolve(item);
  }

  setFrom(source: DataSource, item: Item, data: Object): Promise {
    switch (source) {
      case SOURCE.TRANSPORTER:
        return this._setFromOutside('', item, data);
      case SOURCE.CLIENT_STORAGE:
        return this._setFromOutside('_', item, data);
      case SOURCE.STATE:
        return this._setFromState(item, data);
      default:
        throw new Error('source type is not known');
    }
  }

  static createObservableItem(itemBranch: Object, definition: Object) {
    if (!isPlainObject(definition.properties)) return;

    Object.keys(definition.properties)
      .filter(key => !Schema.isPrimaryKey(definition.properties[key]))
      .forEach((key) => {
        const property = definition.properties[key];
        if (property.type !== Object) {
          if (property.observable === false) {
            return;
          }

          if (property.type === Array) {
            itemBranch[key] = observable.array();
            return;
          }

          itemBranch[key] = observable();
          return;
        }

        itemBranch[key] = observable({});
        Schema.createObservableItem(itemBranch[key], property);
      });
  }

  establishObservables(item: Item) {
    Schema.createObservableItem(item, this._definition);
  }

  static isKey(property) {
    return property.type === Key || property.type === NumberKey;
  }

  static isPrimaryKey(property) {
    return Schema.isKey(property) && property.primary;
  }

  _createObservableKeyList(definition: Object, parentPath : string = '') {
    if (!isPlainObject(definition.properties)) return;

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
    const observables = pick(data, this.observables);
    const references = pick(data, Array.from(this.references.keys()));
    const nonObservables = pick(data, this.nonObservables);

    // IDEA: Check if picking from concatinated array is cheaper
    const allObservables = merge({}, observables, references);
    const filteredData = merge({}, observables, nonObservables);

    return { observables, nonObservables, filteredData, allObservables, references };
  }

  _createReferenceOptions(
    definition: Object,
    path: string,
    item: Object,
    prefix: string,
  ) {
    const def = definition.type === Array ? definition.items : definition;
    const refOptions: Object = {
      definition,
      key: def[`${prefix}key`],
    };

    // Create parent path in if not there yet
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const parentPath = path.substr(0, lastDotIndex);
      refOptions.propertyKey = path.substr(lastDotIndex + 1);
      refOptions.parentObj = get(item, parentPath);
      if (refOptions.parentObj === undefined) {
        refOptions.parentObj = {};
        set(item, parentPath, refOptions.parentObj);
      }
    } else {
      refOptions.parentObj = item;
      refOptions.parentPath = '';
      refOptions.propertyKey = path;
    }

    return refOptions;
  }

  _setForeignValues(item: Item, data: Object, prefix: string) {
    let promises:Array<Promise> = [];
    this.references.forEach((definition, path) => {
      const thisValue = get(data, path);
      if (!thisValue) return;

      const refOptions = this._createReferenceOptions(
        definition,
        path,
        item,
        prefix,
      );

      if (definition.type === Array) {
        const oldAutosaveValue = item.autoSave;
        item.autoSave = false;

        refOptions.parentObj[refOptions.propertyKey] = [];

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
  ): Promise {
    const { observables, filteredData } = this._getPickedData(data);
    Schema._mergeFromSet({ item, filteredData }, observables);
    const promises = this._setForeignValues(item, data, keyPrefix);
    return Promise.all(promises).then(() => item);
  }

  static _mergeFromSet({ item, filteredData }) {
    const oldAutosaveValue = item.autoSave;
    item.autoSave = false;
    merge(item, filteredData);

    item.autoSave = oldAutosaveValue;
  }

  static _resolveForeignValues(
    { definition, key, propertyKey, parentObj },
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
      if (index === undefined) {
        parentObj[propertyKey] = newValue;
      } else {
        parentObj[propertyKey][index] = newValue;
      }

      item.autoSave = oldAutosaveValue;
    });
  }

  static _normalizeProp(prop: any) {
    return isPlainObject(prop) ? this._buildNormalizedDefinition(prop) :
      this._buildNormalizedDefinition({ type: prop });
  }

  static _buildNormalizedProperties(props: Object) {
    return Object.keys(props).reduce((propsObj, key) => {
      const prop = props[key];
      propsObj[key] = this._normalizeProp(prop);
      return propsObj;
    }, {});
  }

  static _buildNormalizedDefinition(prop: Object) {
    switch (prop.type) {
      case Object:
      case undefined:
        return {
          ...prop,
          properties: this._buildNormalizedProperties(prop.properties || {}),
        };

      case Array:
        return {
          ...prop,
          items: this._buildNormalizedDefinition(this._normalizeProp(prop.items || {})),
        };
      default:
        return { ...prop };
    }
  }

  _resolveFor(target: DataTarget, item: Item): Promise {
    const { references } = this._getPickedData(item);
    const unresolvedReferences = [];
    this.references.forEach((value, key) => {
      const ref = get(references, key);
      if (Array.isArray(ref)) {
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
        const ref = get(references, key);
        if (Array.isArray(ref)) {
          const refKeyArray = ref.map(refItem => refItem[value.items[`${prefix}key`]]);
          set(convertedReferences, key, refKeyArray);
        } else {
          set(convertedReferences, key, ref[value[`${prefix}key`]]);
        }
      });

      return merge({}, filteredData, initialData, convertedReferences);
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
export { Key, NumberKey };
