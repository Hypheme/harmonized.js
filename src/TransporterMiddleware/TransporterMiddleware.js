import _ from 'lodash';

export default class TransporterMiddleware {
  // init: function() {},
  // addItemToQueue: function(queueItem, queue) {},
  // updateQueueAfterReceive: function(queueItem, originalItem, queue) {},
  // send: function(req, item) {},
  // receive: function(res, req, item) {},
  // sendError: function(req, item) {},
  // receiveError: function(res, req, item) {},

  static methods = [
    'addItemToQueue',
    'updateQueueAfterReceive',
    'send',
    'receive',
    'sendError',
    'receiveError',
  ];

  static build() {
    const newTransportMiddleware = new this(...arguments[0]);
    const filteredMethods = Array.prototype.slice.call(arguments, 1);
    if (filteredMethods.length > 0) {
      _.difference(this.methods, filteredMethods).forEach((method) => {
        newTransportMiddleware[method] = undefined;
      });
    }

    return newTransportMiddleware;
  }

}
