// @flow
import _ from 'lodash';

export default class TransporterMiddleware {
  // init() {}
  // addItemToQueue(queueItem, queue) {}
  // updateQueueAfterReceive(queueItem, originalItem, queue) {}
  // send(req, item) {}
  // receive(res, req, item) {}
  // sendError(req, item) {}
  // receiveError(res, req, item) {}

  static methods = [
    'addItemToQueue',
    'updateQueueAfterReceive',
    'send',
    'receive',
    'sendError',
    'receiveError',
  ];

  static build(...args) {
    const newTransportMiddleware: Object = new this(...args[0]);
    const filteredMethods = args.slice(1);
    if (filteredMethods.length > 0) {
      _.difference(this.methods, filteredMethods).forEach((method) => {
        newTransportMiddleware[method] = undefined;
      });
    }

    return newTransportMiddleware;
  }

}