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
            front: {
              observable: false,
              type: Number,
            },
            back: Number,
          },
        },
        empty: {
          type: Object,
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
            _getKey: (item) => item.sub.internalId,
            _setKey: (item, value) => (item.sub.internalId = value),
            ref: this.passengerStoreInstance,
          },
        },
        numbers: {
          type: Array,
          items: Number,
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
            front: { type: Number, observable: false },
            back: { type: Number },
          },
        },
        uuid: {
          type: Key,
          key: 'uuid',
          _key: '_id',
          getKey: jasmine.any(Function),
          _getKey: jasmine.any(Function),
          setKey: jasmine.any(Function),
          _setKey: jasmine.any(Function),
          primary: true,
        },
        passengers: {
          type: Array,
          items: {
            type: StringKey,
            key: 'pid',
            getKey: jasmine.any(Function),
            _getKey: jasmine.any(Function),
            setKey: jasmine.any(Function),
            _setKey: jasmine.any(Function),
            ref: this.passengerStoreInstance,
          },
        },
        numbers: {
          type: Array,
          items: {
            type: Number,
          },
        },
      },
    });

    expect(schema.observables).toEqual({
      brand: true,
      seats: {
        back: true,
      },
      uuid: true,
      passengers: true,
      numbers: true,
    });

    expect(schema._isLocked).toBe(true);
  });

  it('should create Schema without defined primary key', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);

    expect(schema._definition).not.toBe(inputDefinition);
    expect(schema._definition.properties.id).toEqual({
      type: Key,
      getKey: jasmine.any(Function),
      _getKey: jasmine.any(Function),
      setKey: jasmine.any(Function),
      _setKey: jasmine.any(Function),
      primary: true,
    });

    expect(schema._definition.properties.id.getKey({ id: 123, _id: 321 })).toBe(123);
    expect(schema._definition.properties.id._getKey({ id: 123, _id: 321 })).toBe(321);

    const item = { id: 123, _id: 321 };
    schema._definition.properties.id.setKey(item, 124);
    expect(item).toEqual({ id: 124, _id: 321 });
    schema._definition.properties.id._setKey(item, 421);
    expect(item).toEqual({ id: 124, _id: 421 });

    expect(schema.observables).toEqual({
      brand: true,
      id: true,
    });
  });

  it('should create Schema without lock', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition, false);
    expect(schema._isLocked).toBe(false);

    schema.lock();
    expect(schema._isLocked).toBe(true);
  });

  it('should set primary transporter key', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);

    const item = {
      brand: 'Volkswagen',
      _id: 567,
    };

    schema.setPrimaryKey(item, { id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 123,
      _id: 567,
    });
  });

  it('should not set primary transporter key after it was already set', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);

    const item = {
      brand: 'Volkswagen',
      id: 9001,
      _id: 567,
    };

    schema.setPrimaryKey(item, { id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 9001,
      _id: 567,
    });
  });

  it('should set primary client storage key', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);

    const item = {
      brand: 'Volkswagen',
      id: 456,
    };

    schema.setPrimaryKey(item, { _id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 456,
      _id: 123,
    });
  });

  it('should not set primary client storage key after it was already set', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);

    const item = {
      brand: 'Volkswagen',
      id: 456,
      _id: 9001,
    };

    schema.setPrimaryKey(item, { _id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 456,
      _id: 9001,
    });
  });
});
