import HttpTransporter from '../../src/Transporters/HttpTransporter';

import runSetup from './suite/index';

runSetup({
  global: {

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
      it('should');
    },
  },
  itemMethods: {
    name: '',
    beforeEach() {
      // some shit
      // like initial fetch
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
      it('should');
    },
  },
});
