import { SOURCE } from '../../src/constants';

export default function runCases(setup, connectionState) {
  function callAdditionalExpects(forCase) {
    if (setup.expects && setup.expects[forCase]) {
      setup.expects[forCase]();
    }
  }

  let store;

  describe('Store', function () {
    xit('should be constructed and do initial fetch', function (done) {
      store = setup.init();

      store.onceLoaded().then(() => {
        // should have fetched from client storage and create items in store
        // should have fetched from transporter and create items in store
        // should handled overlapping data from T and CS accordingly

        callAdditionalExpects('constructInitialFetch');
        done();
      });
    });

    xit('should create a new item from client storage', function (done) {
      //  should be handled in initial fetch test?
      callAdditionalExpects('newItemFromClientStorage');
      done();
    });

    xit('should create a new item from transporter', function () {
      //  should be handled in initial fetch test?
      callAdditionalExpects('newItemFromTransporter');
    });

    xit('should create a new item from state', function (done) {
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

      // TODO: test if data is updated in client storage
      // this should also include hobbies transformed
      // TODO: test if after CS update _id is set
      // TODO: test if data is updated in transporter
      // this should also include hobbies transformed
      // TODO: test if after T update id is set
      // TODO: test if after all is set, everything is synced
      callAdditionalExpects('newItemFromState');
      done();
    });

    xit('should findOneOrFetch an item from client storage', function () {
      callAdditionalExpects('findOneOrFetchFromClientStorage');
    });

    xit('should findOneOrFetch an item from transporter', function () {
      callAdditionalExpects('findOneOrFetchFromTransporter');
    });

    xit('should findOneOrFetch an item from state', function () {
      callAdditionalExpects('findOneOrFetchFromState');
    });

    xit('should fetch complete store from client storage', function () {
      callAdditionalExpects('fetchStoreFromClientStorage');
    });

    xit('should fetch complete store from transporter', function () {
      callAdditionalExpects('fetchStoreFromTransporter');
    });

    xit('should fetch complete store from state', function () {
      callAdditionalExpects('fetchStoreFromState');
    });

    xit('should find items', function () {
      callAdditionalExpects('findItems');
    });

    xit('should find one item', function () {
      callAdditionalExpects('findOneItem');
    });
  });

  describe('Item', function () {
    xit('should be updated from client storage', function () {
      callAdditionalExpects('itemUpdatedFromClientStorage');
    });

    xit('should be updated from transporter', function () {
      callAdditionalExpects('itemUpdatedFromTransporter');
    });

    xit('should be updated from state', function () {
      callAdditionalExpects('itemUpdatedFromState');
    });

    xit('should be deleted from client storage', function () {
      callAdditionalExpects('itemDeletedFromClientStorage');
    });

    xit('should be deleted from transporter', function () {
      callAdditionalExpects('itemDeletedFromTransporter');
    });

    xit('should be deleted from state', function () {
      callAdditionalExpects('itemDeletedFromState');
    });

    xit('should fetch from client storage', function () {
      callAdditionalExpects('itemFetchFromClientStorage');
    });

    xit('should fetch from transporter', function () {
      callAdditionalExpects('itemFetchFromTransporter');
    });
  });
}
