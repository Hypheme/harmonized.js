import Schema, { Key, StringKey } from './Schema';

describe('Schema', function () {
  beforeEach(function () {
    this.passengerStoreInstance = {};
  });

  it('should create Schema', function () {
    const inputDefinition = {
      properties: {
        brand: String,
        price: {
          type: String,
          observable: false,
        },
        seats: {
          type: Object,
          properties: {
            front: Number,
            back: {
              type: Number,
            },
          },
        },
        uuid: {
          type: Key,
          key: 'uuid',
          _key: '_id',
          primary: true,
        },
        passengers: {
          type: Array,
          items: {
            type: StringKey,
            key: 'pid',
            _key: (item) => item.sub.internalId,
            ref: this.passengerStoreInstance,
          },
        },
      },
    };

    const schema = new Schema(inputDefinition);

    expect(schema._definition).not.toBe(inputDefinition);
    expect(schema._definition).toEqual({
      properties: {
        brand: { type: String },
        price: {
          type: String,
          observable: false,
        },
        seats: {
          type: Object,
          properties: {
            front: { type: Number },
            back: { type: Number },
          },
        },
        uuid: {
          type: Key,
          key: jasmine.any(Function),
          _key: jasmine.any(Function),
          primary: true,
        },
        passengers: {
          type: Array,
          items: {
            type: StringKey,
            key: jasmine.any(Function),
            _key: jasmine.any(Function),
            ref: this.passengerStoreInstance,
          },
        },
      },
    });
  });

  it('should create Schema without lock', function () {

  });
});
