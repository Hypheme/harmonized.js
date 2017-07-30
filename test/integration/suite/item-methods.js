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
    setupGeneratorForBlock('itemMethods');

    beforeEach(function () {
      const env = setup.storeConstructor.environment;
      this.store = new Store({
        schema: getSchema(setup),
        clientStorage: env.ClientStorage &&
          new env.ClientStorage(...env.clienStorageArgs),
        transporter: env.Transporter &&
          new env.Transporter(...env.transporterArgs),
      });
      return this.store.onceLoaded()
        .then(() => {
          console.log('creating new item for test');
          this.item = this.store.create(data.item());
          return Promise.all([
            this.item.onceSynced(),
            this.item.onceStored(),
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
      return wrapBeforeAfter('deleteFromClientStorage', () => this.item.delete(SOURCE.CLIENT_STORAGE)
        .then(() => this.item));
    });

    it('should be deleted from transporter', function () {
      return wrapBeforeAfter('deleteFromTransporter', () => this.item.delete(SOURCE.TRANSPORTER)
        .then(() => this.item));
    });

    it('should be deleted from state', function () {
      return wrapBeforeAfter('deleteFromState', () => this.item.delete(SOURCE.STATE)
        .then(() => this.item));
    });

    xit('should fetch from client storage', function () {
      return wrapBeforeAfter('fetchFromClientStorage', () => {});
    });

    xit('should fetch from transporter', function () {
      return wrapBeforeAfter('fetchFromTransporter', () => {});
    });
  });
};
