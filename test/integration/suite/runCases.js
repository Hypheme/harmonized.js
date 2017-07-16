import storeConstructor from './store-constructor';
import storeMethods from './store-methods';
import itemMethods from './item-methods';

export default function runCases(setup, connectionState) {
  const helper = {
    connectionState,
    after: (block, forCase) => {
      if (
        setup[block] &&
        setup[block].cases &&
        setup[block].cases[forCase] &&
        setup[block].cases[forCase].after
      ) {
        return setup.expects[forCase].after();
      }

      return Promise.resolve();
    },
    test: (block, forCase, data) => {
      if (
        setup[block] &&
        setup[block].cases &&
        setup[block].cases[forCase] &&
        setup[block].cases[forCase].test
      ) {
        return setup[block].cases[forCase].test(data);
      }

      return Promise.resolve();
    },

    before: (block, forCase) => {
      if (
        setup[block] &&
        setup[block].cases &&
        setup[block].cases[forCase] &&
        setup[block].cases[forCase].before
      ) {
        return setup[block].cases[forCase].before();
      }

      return Promise.resolve();
    },

    wrapBeforeAfterGenerator: block =>
      (forCase, cb) => Promise.resolve()
        .then(() => helper.before(block, forCase))
        .then(cb)
        .then(data => helper.test(block, forCase, data))
        .then(() => helper.after(block, forCase),
    ),

    setupGeneratorForBlock: (block) => {
      const globals = {
        beforeEach, beforeAll, afterEach, afterAll,
      };
      ['beforeEach', 'beforeAll', 'afterEach', 'afterAll'].forEach((method) => {
        globals[method](function () {
          return setup[block][method];
        });
      });
    },
  };

  storeConstructor(setup, helper);
  storeMethods(setup, helper);

  itemMethods(setup, helper);
}
