import fetchMock from 'fetch-mock';
import HttpTransporter from '../../src/Transporters/HttpTransporter';
import HttpOfflineChecker from '../../src/Transporters/HttpOfflineChecker';

import runSetup from './suite/index';

const mockGenerators = {
  deleteItem: () => fetchMock.mock({
    name: 'deleteItem',
    matcher: 'https://www.hyphe.me/a-route/123',
    method: 'DELETE',
    response: () => ({
      status: 204,
    }),
  }),
  fetchItem: () => fetchMock.mock({
    name: 'fetchItem',
    matcher: 'https://www.hyphe.me/a-route/123',
    method: 'GET',
    response: () => ({
      status: 200,
      body: {
        id: '123',
        name: 'Franzi',
      },
    }),
  }),
};

runSetup({
  global: {

  },
  storeConstructor: {
    name: '',
    beforeEach() {
      // some shit
      // stub(fetch).andReturnValue(data.storeMethods.transporter.items());
    },
    beforeAll() {
    },
    afterEach() {
    },
    afterAll() {
    },
    cases: {
    },
    environment: {
      ClientStorage: undefined,
      Transporter: HttpTransporter,
      transporterArgs: [{
        baseUrl: 'https://www.hyphe.me',
        path: 'a-route',
      }],
    },
    customSpecs: () => {
      // it('should');
    },
  },
  storeMethods: {
    name: '',
    beforeEach() {
      fetchMock.mock({
        name: 'fetchStore',
        matcher: 'https://www.hyphe.me/a-route/',
        method: 'GET',
        response: {
          status: 200,
          body: [{
            id: 9000,
            name: 'hans',
            knownFor: 'nothing',
          }, {
            id: 9001,
            name: 'franz',
            knownFor: 'brandwein',
          }, {
            id: 9002,
            name: 'franz',
            knownFor: 'nichts',
          }],
        },
      });
    },
    beforeAll() {
      HttpTransporter.addOfflineChecker(new HttpOfflineChecker({
        pattern: /https:\/\/www.hyphe.me\/.*?/,
        checkUrl: 'https://www.hyphe.me/status',
      }));
    },
    afterEach() {
      afterEach(fetchMock.restore);
    },
    afterAll() {
    },
    cases: {
      constructInitialFetch: {
        before: () => {},
        after: () => {},
      },
      findOneOrFetchFromState: {
        before: () => {
          // stub(fetch).andReturnValue(data.storeMethods.transporter.items(2));
        },
      },
      newItemFromClientStorage: {
        before: () => {
          fetchMock.mock({
            name: 'createItemFromClientStorage',
            matcher: 'https://www.hyphe.me/a-route',
            method: 'POST',
            response: () => ({
              status: 200,
              body: {
                id: 'hello-id',
                knownFor: 'NeXT',
              },
            }),
          });
        },
        test: (store) => {
          expect(fetchMock.called('createItemFromClientStorage')).toBe(true);
          expect(store.items[3].id).toBe('hello-id');
          expect(store.items[3].knownFor).toBe('Apple Computers');
          // TODO test reference to other store
        },
      },
      newItemFromTransporter: {
        before: () => {
          fetchMock.mock({
            name: 'updateItem',
            matcher: 'https://www.hyphe.me/a-route/9999',
            response: () => ({
              status: 200,
              body: {
                id: 'hello-id',
              },
            }),
          });
        },
        test: (store) => {
          expect(fetchMock.called('updateItem')).toBe(false);
          expect(store.items[3].id).toBe(9999);
        },
      },
      newItemFromState: {
        before: () => {
          fetchMock.mock({
            name: 'postItem',
            matcher: 'https://www.hyphe.me/a-route',
            method: 'POST',
            response: () => ({
              status: 200,
              body: {
                id: 'hello-id',
              },
            }),
          });
        },
        test: (store) => {
          expect(fetchMock.called('postItem')).toBe(true);
          expect(store.items[3].id).toBe('hello-id');

          // TODO test reference to other store
          const body = JSON.parse(fetchMock.lastCall('postItem')[1].body);
          expect(body).toEqual({
            name: 'Steve Jobs',
            knownFor: 'Apple Computers',
            facts: {
              birth: 1955,
              death: 2011,
            },
          });
        },
      },
      findItems: {
        test: (items) => {
          expect(fetchMock.called('fetchStore')).toBe(true);
          expect(items.length).toBe(2);
          expect(items[0].id).toBe(9001);
          expect(items[0].name).toBe('franz');
          expect(items[0].knownFor).toBe('brandwein');
          expect(items[1].id).toBe(9002);
          expect(items[1].name).toBe('franz');
          expect(items[1].knownFor).toBe('nichts');
        },
      },
      findOneItem: {
        test: (item) => {
          expect(fetchMock.called('fetchStore')).toBe(true);
          expect(item.id).toBe(9002);
          expect(item.name).toBe('franz');
          expect(item.knownFor).toBe('nichts');
        },
      },
    },
    environment: {
      ClientStorage: undefined,
      Transporter: HttpTransporter,
      transporterArgs: [],
    },
    customSpecs: () => {
      // it('should');
    },
  },
  itemMethods: {
    name: '',
    beforeEach() {
      // some shit
      // like initial fetch
      // stub(fetch).andReturnValue(data.storeMethods.transporter.items());
      fetchMock.mock({
        name: 'fetch',
        matcher: 'https://www.hyphe.me/a-route/',
        method: 'GET',
        response: () => [],
      });

      fetchMock.mock({
        name: 'itemCreate',
        matcher: 'https://www.hyphe.me/a-route',
        method: 'POST',
        response: (url, options) => ({
          body: {
            ...JSON.parse(options.body),
            id: '123',
          },
          status: 201,
        }),
      });

      fetchMock.mock({
        name: 'item_123_put',
        matcher: 'https://www.hyphe.me/a-route/123',
        method: 'PUT',
        response: (url, options) => ({
          body: {
            ...JSON.parse(options.body),
            put: true,
          },
          status: 200,
        }),
      });
    },
    beforeAll() {
      HttpTransporter.addOfflineChecker(new HttpOfflineChecker({
        pattern: /https:\/\/www.hyphe.me\/.*?/,
        checkUrl: 'https://www.hyphe.me/status',
      }));
    },
    afterEach() {
      afterEach(fetchMock.restore);
    },
    afterAll() {
    },
    cases: {
      constructInitialFetch: {
        before: () => {},
        after: () => {},
      },
      findOneOrFetchFromState: {
        before: () => {
          // stub(fetch).andReturnValue(data.storeMethods.transporter.items(2));
        },
      },
      updateFromClientStorage: {
        test: () => {
          expect(fetchMock.called('item_123_put')).toBe(true);
        },
      },
      updateFromState: {
        test: () => {
          expect(fetchMock.called('item_123_put')).toBe(true);
        },
      },
      deleteFromClientStorage: {
        before: () => {
          mockGenerators.deleteItem();
        },
        test: () => {
          expect(fetchMock.called('itemCreate')).toBe(true);
          expect(fetchMock.called('deleteItem')).toBe(true);
        },
      },
      deleteFromTransporter: {
        before: () => {
          mockGenerators.deleteItem();
        },
        test: () => {
          expect(fetchMock.called('itemCreate')).toBe(true);
          expect(fetchMock.called('deleteItem')).toBe(false);
        },
      },
      deleteFromState: {
        before: () => {
          mockGenerators.deleteItem();
        },
        test: () => {
          expect(fetchMock.called('itemCreate')).toBe(true);
          expect(fetchMock.called('deleteItem')).toBe(true);
        },
      },
      fetchFromClientStorage: {
        before: () => {
          mockGenerators.fetchItem();
        },
        test: (item) => {
          expect(fetchMock.called('itemCreate')).toBe(true);
          expect(fetchMock.called('fetchItem')).toBe(false);
          expect(item.name).toBe('hans');
          expect(item.id).toBe('123');
          expect(item._id).toBeUndefined();
        },
      },
      fetchFromTransporter: {
        before: () => {
          mockGenerators.fetchItem();
        },
        test: (item) => {
          expect(fetchMock.called('itemCreate')).toBe(true);
          expect(fetchMock.called('fetchItem')).toBe(true);
          expect(item.name).toBe('Franzi');
          expect(item.id).toBe('123');
        },
      },
    },
    environment: {
      ClientStorage: undefined,
      Transporter: HttpTransporter,
      transporterArgs: [],
    },
    customSpecs: () => {
      // it('should');
    },
  },
});
