import {
  observable,
  autorun,
  isObservable,
} from 'mobx';

import Schema, { Key, NumberKey } from './Schema';
import { SOURCE, TARGET } from './constants';


describe('Schema', function () {
  class TestItemClass {
    autosaveSetHistory = [];

    set autoSave(value) {
      this.autosaveSetHistory.push(value);
    }

    get autoSave() {
      return 'old autosave value';
    }
  }

  function detach(cb) {
    setTimeout(cb, 0);
  }

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
          properties: {},
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

    schema.setPrimaryKey(SOURCE.TRANSPORTER, item, { _id: 120, id: 123 });
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

    schema.setPrimaryKey(SOURCE.TRANSPORTER, item, { id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 9001,
      _id: 567,
    });
  });

  it('should get key identifier for transporter', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);
    expect(schema.getKeyIdentifierFor(TARGET.TRANSPORTER)).toBe('id');
  });

  it('should get key identifier for client storage', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);
    expect(schema.getKeyIdentifierFor(TARGET.CLIENT_STORAGE)).toBe('_id');
  });

  it('should get key identifier for other', function () {
    const inputDefinition = {
      properties: {
        brand: String,
      },
    };

    const schema = new Schema(inputDefinition);
    expect(() => {
      schema.getKeyIdentifierFor(TARGET.STATE);
    }).toThrowError('unsupported target for getKeyIdentifierFor');
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

    schema.setPrimaryKey(SOURCE.CLIENT_STORAGE, item, { id: 123, _id: 123 });
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

    schema.setPrimaryKey(SOURCE.CLIENT_STORAGE, item, { _id: 123 });
    expect(item).toEqual({
      brand: 'Volkswagen',
      id: 456,
      _id: 9001,
    });
  });

  it('should throw error when primary key for unknown source should be set', function () {
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

    expect(() => {
      schema.setPrimaryKey(SOURCE.STATE, item, { _id: 123 });
    }).toThrow(new Error('unsupported source'));
  });

  it('should get observables', function (done) {
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
    let autorunNav = 1;

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

    const dispose = autorun(() => {
      try {
        schema.getObservables(testItem);
        autorunCount++;
        switch (autorunNav) {
          case 1:
            autorunNav = 2;
            // we detach our first change as it would be recognized otherwise
            detach(() => { testItem.brand = 'OtherTestCar'; });
            break;
          case 2:
            autorunNav = 3;
            testItem.price = 1;
            break;
          case 3:
            autorunNav = 4;
            testItem.seats.front.left = 1;
            break;
          case 4:
            autorunNav = 5;
            testItem.seats.front.right = 2;
            break;
          case 5:
            autorunNav = 6;
            testItem.seats.back = 2;
            break;
          case 6:
            autorunNav = 7;
            testItem.wheels.frontLeft = 'blub';
            break;
          case 7:
            autorunNav = 8;
            testItem.wheels.frontRight = 'blub';
            break;
          case 8:
            autorunNav = 9;
            testItem.wheels.backLeft = 'blub';
            break;
          case 9:
            autorunNav = 10;
            testItem.seats.front.right = 3;
            testItem.wheels.backLeft = 'other_test';
            break;
          case 10:
            testItem.wheels.backRight = 'blub';
            expect(autorunCount).toBe(10);
            detach(dispose);
            detach(done);
            break;
          default:
            done(new Error('utorun nav run out of cases'));
        }
      } catch (e) {
        done(e);
      }
    });
  });

  it('should establishObservables', function (done) {
    const inputDefinition = {
      properties: {
        // TODO foreign keys
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

    const item = new TestItemClass();


    schema.establishObservables(item);
    expect(isObservable(item.brand)).toBe(true);
    expect(isObservable(item.price)).toBe(false);
    expect(isObservable(item.seats.front)).toBe(false);
    expect(isObservable(item.seats.deeper.test)).toBe(true);
    expect(isObservable(item.seats.deeper.evenDeeper.property1)).toBe(false);
    expect(isObservable(item.seats.deeper.evenDeeper.property2)).toBe(true);
    done();
  });

  it('should set item from state', function (done) {
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

    schema.setFrom(SOURCE.STATE, item, data, false)
      .then(() => {
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
      })
      .then(() => schema.setFrom(SOURCE.STATE, item, {
        brand: 'newname',
        seats: {
          deeper: {
            evenDeeper: {
              property2: false,
            },
          },
        },
      }, false))
      .then(() => {
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
        done();
      })
      .catch(done);
  });


  it('should set item from transporter', function (done) {
    const passengerStoreInstance = {
      onceLoaded: jasmine.createSpy('once loaded').and.returnValues(
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
      ),
      findOne: jasmine.createSpy('find one').and.returnValues(
        'item 123',
        'item 124',
        'item 125',
        'item 200',
        'item one',
      ),
    };

    const oneToOneStoreInstance = {
      onceLoaded: jasmine.createSpy('once loaded').and.returnValue(Promise.resolve()),
      findOne: jasmine.createSpy('find one').and.returnValue('over 9000'),
    };

    const inputDefinition = {
      properties: {
        brand: String,
        price: {
          type: String,
          observable: false,
        },
        passengers: {
          type: Array,
          items: {
            type: NumberKey,
            key: 'pid',
            _key: '_pid',
            ref: passengerStoreInstance,
          },
        },
        seats: {
          type: Object,
          properties: {
            oneToOne: {
              type: NumberKey,
              key: 'pid',
              _key: '_pid',
              ref: oneToOneStoreInstance,
            },
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

    const item = new TestItemClass();
    const data = {
      brand: 'testbrand',
      price: '9001€',
      passengers: [123, 124, 125, 200],
      seats: {
        oneToOne: 9001,
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

    schema.setFrom(SOURCE.TRANSPORTER, item, data).then(() => {
      expect(item.brand).toBe('testbrand');
      expect(item.price).toBe('9001€');
      expect(item.seats.oneToOne).toBe('over 9000');
      expect(item.seats.front).toBe(2);
      expect(item.seats.deeper.test).toBe(123);
      expect(item.seats.deeper.evenDeeper.property1).toBe('hello');
      expect(item.seats.deeper.evenDeeper.property2).toBe(true);
      expect(item.passengers).toEqual(['item 123', 'item 124', 'item 125', 'item 200']);

      expect(oneToOneStoreInstance.findOne).toHaveBeenCalledTimes(1);
      expect(oneToOneStoreInstance.findOne).toHaveBeenCalledWith({
        pid: 9001,
      });

      expect(passengerStoreInstance.findOne).toHaveBeenCalledTimes(4);
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        pid: 123,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        pid: 124,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        pid: 125,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        pid: 200,
      });

      data.passengers = [1];
      schema.setFrom(SOURCE.TRANSPORTER, item, data)
        .then(() => {
          expect(item.passengers).toEqual(['item one']);
          expect(passengerStoreInstance.findOne).toHaveBeenCalledTimes(5);
          expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
            pid: 1,
          });
          done();
        });
    });
  });

  it('should item set from client storage without establishing observables', function (done) {
    const passengerStoreInstance = {
      onceLoaded: jasmine.createSpy('once loaded').and.returnValues(
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
      ),
      findOne: jasmine.createSpy('find one').and.returnValues(
        'item 123',
        'item 124',
        'item 125',
        'item 200',
        'item one',
      ),
    };

    const oneToOneStoreInstance = {
      onceLoaded: jasmine.createSpy('once loaded').and.returnValue(Promise.resolve()),
      findOne: jasmine.createSpy('find one').and.returnValue('over 9000'),
    };

    const inputDefinition = {
      properties: {
        brand: String,
        price: {
          type: String,
          observable: false,
        },
        passengers: {
          type: Array,
          items: {
            type: NumberKey,
            key: 'pid',
            _key: '_pid',
            ref: passengerStoreInstance,
          },
        },
        seats: {
          type: Object,
          properties: {
            oneToOne: {
              type: NumberKey,
              key: 'pid',
              _key: '_pid',
              ref: oneToOneStoreInstance,
            },
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

    const item = new TestItemClass();
    const data = {
      brand: 'testbrand',
      price: '9001€',
      passengers: [123, 124, 125, 200],
      seats: {
        oneToOne: 9001,
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

    schema.setFrom(SOURCE.CLIENT_STORAGE, item, data).then((/* resolvedItem */) => {
      expect(item.brand).toBe('testbrand');
      expect(item.price).toBe('9001€');
      expect(item.seats.oneToOne).toBe('over 9000');
      expect(item.seats.front).toBe(2);
      expect(item.seats.deeper.test).toBe(123);
      expect(item.seats.deeper.evenDeeper.property1).toBe('hello');
      expect(item.seats.deeper.evenDeeper.property2).toBe(true);
      expect(item.passengers).toEqual(['item 123', 'item 124', 'item 125', 'item 200']);

      expect(oneToOneStoreInstance.findOne).toHaveBeenCalledTimes(1);
      expect(oneToOneStoreInstance.findOne).toHaveBeenCalledWith({
        _pid: 9001,
      });

      expect(passengerStoreInstance.findOne).toHaveBeenCalledTimes(4);
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        _pid: 123,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        _pid: 124,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        _pid: 125,
      });
      expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
        _pid: 200,
      });

      data.passengers = [1];
      schema.setFrom(SOURCE.CLIENT_STORAGE, item, data).then(() => {
        expect(item.passengers).toEqual(['item one']);
        expect(passengerStoreInstance.findOne).toHaveBeenCalledTimes(5);
        expect(passengerStoreInstance.findOne).toHaveBeenCalledWith({
          _pid: 1,
        });

        done();
      });
    });
  });

  it('should get the primary key for transporter', function () {
    const schema = new Schema({
      properties: {
        __id: {
          type: Key,
          key: '__id',
          _key: '___id',
          primary: true,
        },
      },
    });
    schema._primaryKey = {
      key: '__id',
      _key: '___id',
    };
    expect(schema.getPrimaryKey(TARGET.TRANSPORTER, {
      __id: 123,
      ___id: 321,
    })).toEqual({
      __id: 123,
    });
  });

  it('should get the primary key for client storage', function () {
    const schema = new Schema({
      properties: {
        __id: {
          type: Key,
          key: '__id',
          _key: '___id',
          primary: true,
        },
      },
    });
    schema._primaryKey = {
      key: '__id',
      _key: '___id',
    };
    expect(schema.getPrimaryKey(TARGET.CLIENT_STORAGE, {
      __id: 123,
      ___id: 321,
    })).toEqual({
      ___id: 321,
    });
  });

  describe('getFor', function () {
    beforeEach(function () {
      const passengerStoreInstance = {
        onceLoaded: jasmine.createSpy('once loaded').and.returnValues(
          Promise.resolve(),
          Promise.resolve(),
          Promise.resolve(),
          Promise.resolve(),
          Promise.resolve(),
        ),
        findOne: jasmine.createSpy('find one').and.returnValues(
          'item 123',
          'item 124',
          'item 125',
          'item 200',
          'item one',
        ),
      };

      const oneToOneStoreInstance = {
        onceLoaded: jasmine.createSpy('once loaded').and.returnValue(Promise.resolve()),
        findOne: jasmine.createSpy('find one').and.returnValue('over 9000'),
      };

      this.inputDefinition = {
        properties: {
          brand: String,
          price: {
            type: String,
            observable: false,
          },
          passengers: {
            type: Array,
            items: {
              type: NumberKey,
              key: 'pid',
              _key: '_pid',
              ref: passengerStoreInstance,
            },
          },
          seats: {
            type: Object,
            properties: {
              oneToOne: {
                type: NumberKey,
                key: 'pid',
                _key: '_pid',
                ref: oneToOneStoreInstance,
              },
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

      this.item = {
        brand: 'VW',
        price: '10000€',
        notIncluded: 'prop',
        passengers: [{
          pid: 123,
          _pid: 1230,
          name: 'hi',
          isReadyFor: jasmine.createSpy('isReadyFor'),
          onceReadyFor: jasmine.createSpy('onceReadyFor'),
        }, {
          pid: 124,
          _pid: 1231,
          name: 'hi',
          isReadyFor: jasmine.createSpy('isReadyFor'),
          onceReadyFor: jasmine.createSpy('onceReadyFor'),
        }, {
          pid: 125,
          _pid: 1232,
          name: 'hi',
          isReadyFor: jasmine.createSpy('isReadyFor'),
          onceReadyFor: jasmine.createSpy('onceReadyFor'),
        }],
        seats: {
          oneToOne: {
            pid: 9001,
            _pid: 9002,
            name: 'hi',
            isReadyFor: jasmine.createSpy('isReadyFor'),
            onceReadyFor: jasmine.createSpy('onceReadyFor'),
          },
        },
      };

      this.initialData = {
        supercool: 'property',
        seats: {
          added: 'stuff',
        },
        other: {
          stuff: 'that',
          is: 'included',
        },
      };
    });

    function setItemReady(item) {
      item.isReadyFor.and.returnValue(true);
      item.onceReadyFor.and.returnValue(Promise.resolve());
    }

    function delayItemReady(item) {
      item.isReadyFor.and.returnValues(false, false, false, true);
      item.onceReadyFor.and.returnValue(Promise.resolve());
    }

    describe('with some items not ready yet', function () {
      beforeEach(function () {
        delayItemReady(this.item.passengers[0]);
        setItemReady(this.item.passengers[1]);
        delayItemReady(this.item.passengers[2]);
        delayItemReady(this.item.seats.oneToOne);
      });

      it('should get for client storage', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.CLIENT_STORAGE, this.item, this.initialData).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [1230, 1231, 1232],
            seats: {
              oneToOne: 9002,
              added: 'stuff',
            },
            supercool: 'property',
            other: {
              stuff: 'that',
              is: 'included',
            },
          });

          expect(this.item.passengers[0].isReadyFor).toHaveBeenCalledTimes(4);
          expect(this.item.passengers[0].onceReadyFor).toHaveBeenCalledTimes(3);
          expect(this.item.passengers[1].isReadyFor).toHaveBeenCalledTimes(4);
          expect(this.item.passengers[1].onceReadyFor).toHaveBeenCalledTimes(0);
          expect(this.item.passengers[2].isReadyFor).toHaveBeenCalledTimes(4);
          expect(this.item.passengers[2].onceReadyFor).toHaveBeenCalledTimes(3);
          expect(this.item.seats.oneToOne.isReadyFor).toHaveBeenCalledTimes(4);
          expect(this.item.seats.oneToOne.onceReadyFor).toHaveBeenCalledTimes(3);

          done();
        });
      });

      it('should get for client storage without initial data', function (done) {
        delayItemReady(this.item.passengers[0]);
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.CLIENT_STORAGE, this.item).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [1230, 1231, 1232],
            seats: {
              oneToOne: 9002,
            },
          });

          done();
        });
      });

      it('should get for transporter', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.TRANSPORTER, this.item, this.initialData).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [123, 124, 125],
            seats: {
              oneToOne: 9001,
              added: 'stuff',
            },
            supercool: 'property',
            other: {
              stuff: 'that',
              is: 'included',
            },
          });

          done();
        });
      });

      it('should get for transporter without initial data', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.TRANSPORTER, this.item).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [123, 124, 125],
            seats: {
              oneToOne: 9001,
            },
          });

          done();
        });
      });
    });

    describe('with all items ready directly', function () {
      beforeEach(function () {
        setItemReady(this.item.passengers[0]);
        setItemReady(this.item.passengers[1]);
        setItemReady(this.item.passengers[2]);
        setItemReady(this.item.seats.oneToOne);
      });

      it('should get for client storage', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.CLIENT_STORAGE, this.item, this.initialData).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [1230, 1231, 1232],
            seats: {
              oneToOne: 9002,
              added: 'stuff',
            },
            supercool: 'property',
            other: {
              stuff: 'that',
              is: 'included',
            },
          });

          expect(this.item.passengers[0].isReadyFor).toHaveBeenCalledTimes(1);
          expect(this.item.passengers[0].onceReadyFor).toHaveBeenCalledTimes(0);
          expect(this.item.passengers[1].isReadyFor).toHaveBeenCalledTimes(1);
          expect(this.item.passengers[1].onceReadyFor).toHaveBeenCalledTimes(0);
          expect(this.item.passengers[2].isReadyFor).toHaveBeenCalledTimes(1);
          expect(this.item.passengers[2].onceReadyFor).toHaveBeenCalledTimes(0);
          expect(this.item.seats.oneToOne.isReadyFor).toHaveBeenCalledTimes(1);
          expect(this.item.seats.oneToOne.onceReadyFor).toHaveBeenCalledTimes(0);

          done();
        });
      });

      it('should get for client storage without initial data', function (done) {
        delayItemReady(this.item.passengers[0]);
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.CLIENT_STORAGE, this.item).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [1230, 1231, 1232],
            seats: {
              oneToOne: 9002,
            },
          });

          done();
        });
      });

      it('should get for transporter', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.TRANSPORTER, this.item, this.initialData).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [123, 124, 125],
            seats: {
              oneToOne: 9001,
              added: 'stuff',
            },
            supercool: 'property',
            other: {
              stuff: 'that',
              is: 'included',
            },
          });

          done();
        });
      });

      it('should get for transporter without initial data', function (done) {
        const schema = new Schema(this.inputDefinition);
        schema.getFor(TARGET.TRANSPORTER, this.item).then((returnedData) => {
          expect(returnedData).toEqual({
            brand: 'VW',
            price: '10000€',
            passengers: [123, 124, 125],
            seats: {
              oneToOne: 9001,
            },
          });

          done();
        });
      });
    });
  });
});
