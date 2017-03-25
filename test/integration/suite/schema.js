import { Schema, customTypes } from '../../../src/index';

const { NumberKey } = customTypes;

export default () => new Schema({
  properties: {
    name: String,
    knownFor: String,
    hobbies: {
      type: Array,
      items: {
        type: NumberKey,
        key: 'id',
        _key: '_id',

      // TODO: add ref
        ref: undefined,
      },
    },
    facts: {
      type: Object,
      properties: {
        birth: Number,
        death: Number,
        achivements: Object,
      },
    },
  },
});
