import fetchMock from 'fetch-mock';
import HttpTransporter from '../../src/Transporters/HttpTransporter';

import runSetup from './suite/index';

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
        name: 'itemCreate',
        matcher: 'www.hyphe.me/a-route',
        method: 'POST',
        response() {
          console.log('POST ASLHLHFLSHAHL');
          return {
            body: {
              id: '123',
            },
            status: 201,
          };
        },
      });
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
      deleteFromClientStorage: {
        before: () => {
          fetchMock.mock({
            name: 'deleteFromClientStorage',
            matcher: 'www.hyphe.me/a-route/dang',
            method: 'DELETE',
            response: {
              status: 204,
              body: {},
            },
          });
        },
        test: (item) => {

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
