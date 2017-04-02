import { constants, Store } from '../../../src/index';

import { itemMethods as data } from './data';
import getSchema from './schema';

const { SOURCE } = constants;

export default (setup, {
  connectionState,
  setupGeneratorForBlock,
  wrapBeforeAfterGenerator,
}) => {
  describe('Item', function () {
    const wrapBeforeAfter = wrapBeforeAfterGenerator('itemMethods');
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
          return this.item.onceLoaded();
        });
    });

    if (setup.itemMethods && setup.itemMethods.customSpecs) {
      setup.itemMethods.customSpecs();
    }

    it('should be updated from client storage', function () {
      return wrapBeforeAfter('updateFromClientStorage', () =>
        this.item.update(data.itemUpdates(), SOURCE.CLIENT_STORAGE)
          .then(() => {
            // TODO expects item data
            expect(this.item.name).toEqual('hans');
            // expects transporter data (needs to be in emtpy-http.run.js)
          }),
      );
    });

    xit('should be updated from transporter', function () {
      return wrapBeforeAfter('updateFromTransporter', () => {});
    });

    xit('should be updated from state', function () {
      return wrapBeforeAfter('updateFromState', () =>
        this.item.update(' TODO item data')
          .then(() => {
            // TODO expects item data
          }),
      );
    });

    xit('should be deleted from client storage', function () {
      return wrapBeforeAfter('deleteFromClientStorage', () => {});
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
