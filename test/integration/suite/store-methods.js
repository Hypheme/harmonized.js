// TODO import from src/index to make sure we export everything properly
import { Store } from '../../../src/index';
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
      const env = setup.storeConstructor.environment;
      this.store = new Store({
        schema: getSchema(setup),
        clientStorage: env.ClientStorage &&
          new env.ClientStorage(...env.clienStorageArgs),
        transporter: env.Transporter &&
          new env.Transporter(...env.transporterArgs),
      });

      return this.store.onceLoaded();
    });

    if (setup.storeMethods && setup.storeMethods.customSpecs) {
      setup.storeMethods.customSpecs();
    }

    it('should create a new item from client storage', function () {
      return wrapBeforeAfter('newItemFromClientStorage', () => {
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
        }, SOURCE.CLIENT_STORAGE);

        expect(this.store.items[3]).toEqual(createdItem);
        expect(createdItem._id).toBeUndefined();
        expect(createdItem.id).toBeUndefined();
        expect(createdItem.unknown).toBeUndefined();

        const readyForCs = createdItem.onceReadyFor(TARGET.CLIENT_STORAGE);
        const readyForT = createdItem.onceReadyFor(TARGET.TRANSPORTER);
        return Promise.all([readyForCs, readyForT]).then(() => this.store);
      });
    });

    it('should create a new item from transporter', function () {
      return wrapBeforeAfter('newItemFromTransporter', () => {
        const createdItem = this.store.create({
          name: 'Steve Jobs',
          knownFor: 'Apple Computers',
          id: 9999,
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
        }, SOURCE.TRANSPORTER);

        expect(this.store.items[3]).toEqual(createdItem);
        expect(createdItem._id).toBeUndefined();
        expect(createdItem.id).toBe(9999);
        expect(createdItem.unknown).toBeUndefined();

        const readyForCs = createdItem.onceReadyFor(TARGET.CLIENT_STORAGE);
        const readyForT = createdItem.onceReadyFor(TARGET.TRANSPORTER);
        return Promise.all([readyForCs, readyForT]).then(() => this.store);
      });
    });

    it('should create a new item from state', function () {
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
        expect(this.store.items[3]).toEqual(createdItem);
        expect(createdItem._id).toBeUndefined();
        expect(createdItem.id).toBeUndefined();
        expect(createdItem.unknown).toBeUndefined();

        const readyForCs = createdItem.onceReadyFor(TARGET.CLIENT_STORAGE);
        const readyForT = createdItem.onceReadyFor(TARGET.TRANSPORTER);
        return Promise.all([readyForCs, readyForT]).then(() => this.store);
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

    it('should find items', function () {
      return wrapBeforeAfter('findItems', () => this.store.find({
        name: 'franz',
      }));
    });

    it('should find one item', function () {
      return wrapBeforeAfter('findOneItem', () => this.store.findOne({
        name: 'franz',
        knownFor: 'nichts',
      }));
    });
  });
};
