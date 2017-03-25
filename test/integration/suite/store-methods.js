// TODO import from src/index to make sure we export everything properly
import { SOURCE, TARGET } from '../../../src/constants';
import getSchema from './schema';

export default (setup, {
  setupGeneratorForBlock,
  wrapBeforeAfterGenerator,
}) => {
  describe('Store Methods', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('storeMethods');
    setupGeneratorForBlock('storeMethods');

    beforeEach(function () {
      this.schema = getSchema(setup);
      // create new store out of environment
      // this.store = new Store(setup.StoreMethods.environment)
      // stub initialFetch, pollute with xample data
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
        const createdItem = this.store.create({
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
        expect(this.store.items.has(createdItem)).toBe(true);
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
};
