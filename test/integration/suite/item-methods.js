import { constants, Store } from '../../../src/index';

import getSchema from './schema';

export default (setup, {
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
      this.item = this.store.create(/*TODO initial item data*/);
    });

    if (setup.itemMethods && setup.itemMethods.customSpecs) {
      setup.itemMethods.customSpecs();
    }

    xit('should be updated from client storage', function () {
      return wrapBeforeAfter('updatedFromClientStorage', () => {});
    });

    xit('should be updated from transporter', function () {
      return wrapBeforeAfter('updatedFromTransporter', () => {});
    });

    xit('should be updated from state', function () {
      return wrapBeforeAfter('updatedFromState', () => {});
    });

    xit('should be deleted from client storage', function () {
      return wrapBeforeAfter('deletedFromClientStorage', () => {});
    });

    xit('should be deleted from transporter', function () {
      return wrapBeforeAfter('deletedFromTransporter', () => {});
    });

    xit('should be deleted from state', function () {
      return wrapBeforeAfter('deletedFromState', () => {});
    });

    xit('should fetch from client storage', function () {
      return wrapBeforeAfter('fetchFromClientStorage', () => {});
    });

    xit('should fetch from transporter', function () {
      return wrapBeforeAfter('fetchFromTransporter', () => {});
    });
  });
};
