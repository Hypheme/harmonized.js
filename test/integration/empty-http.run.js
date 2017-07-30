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
      constructInitialFetch: {
        before: () => {},
        after: () => {},
      },
      findOneOrFetchFromState: {
        before: () => {
          // stub(fetch).andReturnValue(data.storeMethods.transporter.items(2));
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
