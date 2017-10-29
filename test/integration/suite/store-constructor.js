// TODO import from src/index to make sure we export everything properly
import { SOURCE, TARGET } from '../../../src/constants';

import getSchema from './schema';

export default (setup, {
  setupGeneratorForBlock,
  wrapBeforeAfterGenerator,
}) => {
  describe('Store Constructor', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('storeConstructor');
    setupGeneratorForBlock('storeConstructor');

    if (setup.storeConstructor && setup.storeConstructor.customSpecs) {
      setup.storeConstructor.customSpecs();
    }

    xit('should be constructed and do initial fetch', function () {
      return wrapBeforeAfter('constructInitialFetch', () => {
        this.schema = getSchema(setup);

        return this.store.onceLoaded().then(() => {
        // should have fetched from client storage and create items in store
        // should have fetched from transporter and create items in store
        // should handled overlapping data from T and CS accordingly
        });
      });
    });
  });
};
