// @flow

export default class TransporterMiddleware {
  // init() {}
  // addItemToQueue(queueItem, queue) {}
  // send(req, item) {}
  // receive(res, req, item) {}
  // transmissionError(res?, req, item) {}

  get name() {
    return this.constructor.uniqueName;
  }

  static uniqueName: string;

  static methods = [
    'addItemToQueue',
    'send',
    'receive',
    'transmissionError',
  ];

  static build(...args) {
    const newTransportMiddleware: Object = new this(...args[0]);
    const filteredMethods = args.slice(1);
    if (filteredMethods.length > 0) {
      this.methods
        .filter(method => filteredMethods.indexOf(method) === -1)
        .forEach((method) => {
          newTransportMiddleware[method] = undefined;
        });
    }

    return newTransportMiddleware;
  }

}
