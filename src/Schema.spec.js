import {
  observable,
  autorun,
} from 'mobx';

import Schema, { Key, NumberKey } from './Schema';

describe('Schema', function () {
  beforeEach(function () {
    this.passengerStoreInstance = {};
    this.superStoreInstance = {};
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
        oneToOne: {
          type: NumberKey,
          key: 'pid',
          _key: '_pid',
          ref: this.superStoreInstance,
        },
        passengers: {
          type: Array,
          items: {
            type: NumberKey,
            key: 'pid',
            _key: '_pid',
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
          primary: true,
        },
        empty: {
          type: Object,
        },
        oneToOne: {
          type: NumberKey,
          key: 'pid',
          _key: '_pid',
          ref: this.superStoreInstance,
        },
        passengers: {
          type: Array,
          items: {
            type: NumberKey,
            key: 'pid',
            _key: '_pid',
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

    expect(schema.observables).toEqual(['brand', 'seats.back', 'numbers']);
    expect(Array.from(schema.references)).toEqual([['oneToOne', {
      type: NumberKey,
      key: 'pid',
      _key: '_pid',
      ref: this.superStoreInstance,
    }], ['passengers', {
      type: Array,
      items: {
        type: NumberKey,
        key: 'pid',
        _key: '_pid',
        ref: this.passengerStoreInstance,
      },
    }]]);
    expect(schema.nonObservables).toEqual(['price', 'seats.front']);

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
      key: 'id',
      _key: '_id',
      primary: true,
    });

    const item = { id: 123, _id: 321 };
    item[schema._definition.properties.id.key] = 123;
    item[schema._definition.properties.id._key] = 321;

    item[schema._definition.properties.id.key] = 124;
    expect(item).toEqual({ id: 124, _id: 321 });
    item[schema._definition.properties.id._key] = 421;
    expect(item).toEqual({ id: 124, _id: 421 });

    expect(schema.observables).toEqual(['brand']);
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

  it('should get observables', function () {
    const inputDefinition = {
      properties: {
        brand: String,
        price: Number,
        seats: {
          type: Object,
          properties: {
            front: {
              type: Object,
              properties: {
                left: Number,
                right: Number,
              },
            },
            back: Number,
          },
        },
        wheels: {
          type: Object,
          properties: {
            frontLeft: String,
            frontRight: String,
            backLeft: String,
            backRight: {
              type: String,
              observable: false,
            },
          },
        },
      },
    };

    const schema = new Schema(inputDefinition);

    let autorunCount = 0;

    class TestItem {
      @observable brand = 'TestCar';
      @observable price = 9001;
      seats = observable({
        front: {
          left: 0,
          right: 0,
        },
        back: 0,
      });
      wheels = observable({
        frontLeft: 'test',
        frontRight: 'test',
        backLeft: 'test',
        backRight: 'test',
      });
    }

    const testItem = new TestItem();

    autorun(() => {
      schema.getObservables(testItem);
      autorunCount += 1;
    });

    expect(autorunCount).toBe(1);

    testItem.brand = 'OtherTestCar';
    expect(autorunCount).toBe(2);

    testItem.price = 1;
    expect(autorunCount).toBe(3);

    testItem.seats.front.left = 1;
    expect(autorunCount).toBe(4);

    testItem.seats.front.right = 2;
    expect(autorunCount).toBe(5);

    testItem.seats.back = 2;
    expect(autorunCount).toBe(6);

    testItem.wheels.frontLeft = 'blub';
    expect(autorunCount).toBe(7);

    testItem.wheels.frontRight = 'blub';
    expect(autorunCount).toBe(8);

    testItem.wheels.backLeft = 'blub';
    expect(autorunCount).toBe(9);

    testItem.wheels.backRight = 'blub';
    expect(autorunCount).toBe(9);

    testItem.seats.front.right = 3;
    testItem.wheels.backLeft = 'other_test';
    expect(autorunCount).toBe(11);

    testItem.seats.front.right = 3;
    expect(autorunCount).toBe(11);
  });

  it('should set item from state without establishing observables', function () {
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
            deeper: {
              type: Object,
              properties: {
                test: Number,
                evenDeeper: {
                  type: Object,
                  properties: {
                    property1: {
                      type: String,
                      observable: false,
                    },
                    property2: Boolean,
                  },
                },
              },
            },
          },
        },
        empty: {
          type: Object,
        },
      },
    };

    const schema = new Schema(inputDefinition);

    class TestItemClass {}
    const item = new TestItemClass();
    const data = {
      brand: 'testbrand',
      price: '9001€',
      seats: {
        front: 2,
        deeper: {
          test: 123,
          evenDeeper: {
            property1: 'hello',
            property2: true,
          },
        },
      },
    };

    schema.setFromState(item, data, false);
    expect(item.brand).toBe('testbrand');
    expect(item.price).toBe('9001€');
    expect(item.seats).toEqual({
      front: 2,
      deeper: {
        test: 123,
        evenDeeper: {
          property1: 'hello',
          property2: true,
        },
      },
    });

    schema.setFromState(item, {
      brand: 'newname',
      seats: {
        deeper: {
          evenDeeper: {
            property2: false,
          },
        },
      },
    }, false);

    expect(item.brand).toBe('newname');
    expect(item.price).toBe('9001€');
    expect(item.seats).toEqual({
      front: 2,
      deeper: {
        test: 123,
        evenDeeper: {
          property1: 'hello',
          property2: false,
        },
      },
    });
  });

  it('should set item from state with establishing observables', function () {
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
            deeper: {
              type: Object,
              properties: {
                test: Number,
                evenDeeper: {
                  type: Object,
                  properties: {
                    property1: {
                      type: String,
                      observable: false,
                    },
                    property2: Boolean,
                  },
                },
              },
            },
          },
        },
        empty: {
          type: Object,
        },
      },
    };

    const schema = new Schema(inputDefinition);

    class TestItemClass {}
    const item = new TestItemClass();
    const data = {
      brand: 'testbrand',
      price: '9001€',
      seats: {
        front: 2,
        deeper: {
          test: 123,
          evenDeeper: {
            property1: 'hello',
            property2: true,
          },
        },
      },
    };

    schema.setFromState(item, data, true);
    expect(item.brand).toBe('testbrand');
    expect(item.price).toBe('9001€');
    expect(item.seats.front).toBe(2);
    expect(item.seats.deeper.test).toBe(123);
    expect(item.seats.deeper.evenDeeper.property1).toBe('hello');
    expect(item.seats.deeper.evenDeeper.property2).toBe(true);

    let autorunCount = 0;
    autorun(() => {
      let blub = '';
      blub = item.brand;
      blub = item.price;
      blub = item.seats.deeper.evenDeeper.property1;
      blub = item.seats.deeper.evenDeeper.property2;
      autorunCount += 1;
      return blub;
    });

    schema.setFromState(item, {
      brand: 'newname',
      seats: {
        deeper: {
          evenDeeper: {
            property2: false,
          },
        },
      },
    }, false);

    expect(item.brand).toBe('newname');
    expect(item.price).toBe('9001€');
    expect(item.seats.front).toBe(2);
    expect(item.seats.deeper.test).toBe(123);
    expect(item.seats.deeper.evenDeeper.property1).toBe('hello');
    expect(item.seats.deeper.evenDeeper.property2).toBe(false);

    expect(autorunCount).toBe(3);

    schema.setFromState(item, {
      brand: 'supernewname',
      seats: {
        front: 3,
        newProp: 1000,
        deeper: {
          evenDeeper: {
            property1: 'hahaha',
          },
        },
      },
    }, false);

    expect(autorunCount).toBe(4);
    expect(item.seats.front).toBe(3);
    expect(item.seats.newProp).toBe(undefined);
    expect(item.seats.front).toBe(3);
    expect(item.seats.deeper.evenDeeper.property1).toBe('hahaha');
  });
});
