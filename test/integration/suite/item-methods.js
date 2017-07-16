import { constants, Store } from '../../../src/index';

import { itemMethods as data } from './data';
import getSchema from './schema';
import { expectItem } from './utils';

const { SOURCE, TARGET } = constants;

export default (setup, {
  connectionState,
  setupGeneratorForBlock,
  wrapBeforeAfterGenerator,
}) => {
  describe('Item', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('itemMethods');
    const cases = setup.itemMethods.cases;
    setupGeneratorForBlock('itemMethods');

    beforeEach(function () {
      this.store = new Store({
        schema: getSchema(setup),
        clientStorage: setup.ClientStorage &&
          new setup.ClientStorage(...setup.clienStorageArgs),
        transporter: setup.Transporter &&
          new setup.Transporter(...setup.transporterArgs),
      });
      return this.store.onceLoaded()
        .then(() => {
          this.item = this.store.create(data.item());
          //
          return Promise.all([
            this.item.onceReadyFor(TARGET.TRANSPORTER),
            this.item.onceReadyFor(TARGET.CLIENT_STORAGE),
          ]);
        });
    });

    if (setup.itemMethods && setup.itemMethods.customSpecs) {
      setup.itemMethods.customSpecs();
    }

    it('should be updated from client storage', function () {
      return wrapBeforeAfter('updateFromClientStorage', () =>
        this.item.update(data.itemUpdates(), SOURCE.CLIENT_STORAGE)
          .then(() => {
            expectItem(this.item, data.expectedItemUpdates());
            // expects transporter data (needs to be in emtpy-http.run.js)
          }),
      );
    });

    it('should be updated from transporter', function () {
      return wrapBeforeAfter('updateFromTransporter', () =>
        this.item.update(data.itemUpdates(), SOURCE.TRANSPORTER)
          .then(() => {
            expectItem(this.item, data.expectedItemUpdates());
            // expects client storage data
          }),
      );
    });

    it('should be updated from state', function () {
      return wrapBeforeAfter('updateFromState', () =>
        this.item.update(data.itemUpdates())
          .then(() => {
            expectItem(this.item, data.expectedItemUpdates());
            // expects client storage data
            // expects transporter storage data
          }),
      );
    });

    it('should be deleted from client storage', function () {
      return wrapBeforeAfter('deleteFromClientStorage', () =>
        this.item.delete(SOURCE.CLIENT_STORAGE)
          .then(() =>
            // expects client storage data
            // expects transporter storage data
             this.item),
      );
    });

    xit('should be deleted from transporter', function () {
      return wrapBeforeAfter('deleteFromTransporter', () => {});
    });

    xit('should be deleted from state', function () {
      return wrapBeforeAfter('deleteFromState', () => {});
    });

    xit('should fetch from client storage', function () {
      return wrapBeforeAfter('fetchFromClientStorage', () => {});
    });

    xit('should fetch from transporter', function () {
      return wrapBeforeAfter('fetchFromTransporter', () => {});
    });
  });
};
