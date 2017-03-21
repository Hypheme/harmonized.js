import { SOURCE, TARGET } from '../../src/constants';
import Schema, { NumberKey } from '../../src/Schema';

export default function runCases(setup, connectionState) {
  const after = (block, forCase) => {
    if (
      setup[block] &&
      setup[block].cases &&
      setup[block].cases[forCase] &&
      setup[block].cases[forCase].after
    ) {
      return setup.expects[forCase].after();
    }

    return Promise.resolve();
  };

  const before = (block, forCase) => {
    if (
      setup[block] &&
      setup[block].cases &&
      setup[block].cases[forCase] &&
      setup[block].cases[forCase].before
    ) {
      return setup.expects[forCase].before();
    }

    return Promise.resolve();
  };

  const wrapBeforeAfterGenerator = block =>
    (forCase, cb) => before(block, forCase).then(cb).then(() => after(block, forCase),
  );

  const setupGeneratorForBlock = block =>
    ['beforeEach, beforeAll', 'afterEach', 'afterAll'].forEach((method) => {
      window[method](function () {
        return setup[block][method];
      });
    });

  let store;
  let schema;

  describe('Store Constructor', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('storeConstructor');
    setupGeneratorForBlock('storeConstructor');

    if (setup.storeConstructor && setup.storeConstructor.customSpecs) {
      setup.storeConstructor.customSpecs();
    }

    xit('should be constructed and do initial fetch', function () {
      return wrapBeforeAfter('constructInitialFetch', () => {
        schema = new Schema({
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
        store = setup.init(schema);

        return store.onceLoaded().then(() => {
          // should have fetched from client storage and create items in store
          // should have fetched from transporter and create items in store
          // should handled overlapping data from T and CS accordingly
        });
      });
    });
  });

  describe('Store Methods', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('storeMethods');
    setupGeneratorForBlock('storeMethods');

    beforeEach(function () {
      // create new store out of environment
      // this.store = new Store(setup.StoreMethods.environment) stub initialFetch, pollute with xample data
    });

    if (setup.storeMethods && setup.storeMethods.customSpecs) {
      setup.storeMethods.customSpecs();
    }

    xit('should create a new item from client storage', function () {
      return wrapBeforeAfter('newItemFromClientStorage', () => {

      });
    });

    xit('should create a new item from transporter', function () {
      return wrapBeforeAfter('newItemFromTransporter', () => {

      });
    });

    xit('should create a new item from state', function () {
      return wrapBeforeAfter('newItemFromState', () => {
        const createdItem = store.create({
          name: 'Steve Jobs',
          knownFor: 'Apple Computers',
          hobbies: [{
            id: 123,
            _id: 100,
            name: 'calligraphy',
          }, {
            id: 124,
            _id: 101,
            name: 'keynotes',
          }],
          facts: {
            birth: 1955,
            death: 2011,
            achivements: {
              Macintosh: 1984,
              iPod: 2001,
              iPhone: 2007,
            },
          },
          unknown: 'property',
        });
        expect(store.items.has(createdItem)).toBe(true);
        expect(createdItem._id).toBeUndefinded();
        expect(createdItem.id).toBeUndefinded();
        expect(createdItem.unknown).toBeUndefinded();

        const readyForCs = createdItem.onceReadyFor(TARGET.CLIENT_STORAGE)
          .then(() => {
            // TODO: test if after CS update _id is set
          });

        const readyForT = createdItem.onceReadyFor(TARGET.TRANSPORTER)
          .then(() => {
            // TODO: test if after CS update _id is set
          });

        // TODO: test if data is updated in client storage
        // this should also include hobbies transformed
        // TODO: test if data is updated in transporter
        // this should also include hobbies transformed
        // TODO: test if after T update id is set

        return Promise.all([readyForCs, readyForT]).then(() => {
          // TODO: test if after all is set, everything is synced
        });
      });
    });

    xit('should findOneOrFetch an item from client storage', function () {
      return wrapBeforeAfter('findOneOrFetchFromClientStorage', () => {

      });
    });

    xit('should findOneOrFetch an item from transporter', function () {
      return wrapBeforeAfter('findOneOrFetchFromTransporter', () => {});
    });

    xit('should findOneOrFetch an item from state', function () {
      return wrapBeforeAfter('findOneOrFetchFromState', () => {});
    });

    xit('should fetch complete store from client storage', function () {
      return wrapBeforeAfter('fetchStoreFromClientStorage', () => {});
    });

    xit('should fetch complete store from transporter', function () {
      return wrapBeforeAfter('fetchStoreFromTransporter', () => {});
    });

    xit('should fetch complete store from state', function () {
      return wrapBeforeAfter('fetchStoreFromState', () => {});
    });

    xit('should find items', function () {
      return wrapBeforeAfter('findItems', () => {});
    });

    xit('should find one item', function () {
      return wrapBeforeAfter('findOneItem', () => {});
    });
  });

  describe('Item', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('itemMethods');
    setupGeneratorForBlock('itemMethods');

    beforeEach(function () {
      // this.item=  new item, polute store without data
    });

    if (setup.itemMethods && setup.itemMethods.customSpecs) {
      setup.itemMethods.customSpecs();
    }

    xit('should be updated from client storage', function () {
      return wrapBeforeAfter('updatedFromClientStorage', () => {});
    });

    xit('should be updated from transporter', function () {
      return wrapBeforeAfter('updatedFromTransporter', () => {});
    });

    xit('should be updated from state', function () {
      return wrapBeforeAfter('updatedFromState', () => {});
    });

    xit('should be deleted from client storage', function () {
      return wrapBeforeAfter('deletedFromClientStorage', () => {});
    });

    xit('should be deleted from transporter', function () {
      return wrapBeforeAfter('deletedFromTransporter', () => {});
    });

    xit('should be deleted from state', function () {
      return wrapBeforeAfter('deletedFromState', () => {});
    });

    xit('should fetch from client storage', function () {
      return wrapBeforeAfter('fetchFromClientStorage', () => {});
    });

    xit('should fetch from transporter', function () {
      return wrapBeforeAfter('fetchFromTransporter', () => {});
    });
  });
}
