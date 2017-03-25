import storeConstructor from './store-constructor';
import storeMethods from './store-methods';
import itemMethods from './item-methods';

export default function runCases(setup) {
  const helper = {
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

    before: (block, forCase) => {
      if (
        setup[block] &&
        setup[block].cases &&
        setup[block].cases[forCase] &&
        setup[block].cases[forCase].before
      ) {
        return setup.expects[forCase].before();
      }

      return Promise.resolve();
    },

    wrapBeforeAfterGenerator: block =>
      (forCase, cb) => helper.before(block, forCase)
        .then(cb)
        .then(() => helper.after(block, forCase),
    ),

    setupGeneratorForBlock: block =>
      ['beforeEach, beforeAll', 'afterEach', 'afterAll'].forEach((method) => {
        window[method](function () {
          return setup[block][method];
        });
      }),
  };

  storeConstructor(setup, helper);
  storeMethods(setup, helper);

  itemMethods(setup, helper);
}
