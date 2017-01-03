// @flow
import TransactionItem from './TransactionItem';
import TransporterMiddleware from './TransporterMiddleware/TransporterMiddleware';

export default class BaseTransporter {
  static middleware: TransporterMiddleware[] = [];

  _shouldBeImplemented() {
    // istanbul ignore next
    throw new Error('should be implemented by the transporter');
  }

  create(data: Object) {
    return this._sendRequest(new TransactionItem('create', data));
  }

  update(data: Object) {
    return this._sendRequest(new TransactionItem('update', data));
  }

  delete(data: Object) {
    return this._sendRequest(new TransactionItem('delete', data));
  }

  fetch(data: Object) {
    return this._sendRequest(new TransactionItem('fetch', data));
  }

  fetchAll() {
    return this._sendRequest(new TransactionItem('fetchAll', {}));
  }

  initialFetch() {
    return this._sendRequest(new TransactionItem('initialFetch', {}));
  }

  _prepareRequest(/* item: TransactionItem */) {
    // istanbul ignore next
    this._shouldBeImplemented();
  }

  _request(/* data: Object */) {
    // istanbul ignore next
    this._shouldBeImplemented();
  }

  _sendRequest(item: TransactionItem) {
    const preparedReq = this._prepareRequest(item);
    const action = item.action;

    // run send middleware then send and afterwards work off the queue
    return this.constructor.runMiddleware('send', preparedReq)
      .then(this._request.bind(this))
      // when error run transmissionError middleware
      .catch(({ error, req }) => this.constructor
        .runMiddleware('transmissionError', { action, req, error })
        .then(() => Promise.reject({ error, req })))
      .then(({ res, req }) => this.constructor.runMiddleware('receive', { action, req, res }))
      .then(({ res }) => res);
  }

  static add(mw) {
    if (mw.replaces) {
      const foundId = this.middleware.findIndex((thisMw) => thisMw.name === mw.replaces);
      if (foundId === -1) {
        throw new Error(
          `The middleware "${mw.replaces}" could not be replaced because it can\'t be found`
        );
      }

      this.middleware.splice(foundId, 1, mw);
      return;
    }

    this.middleware.push(mw);
  }

  static runMiddleware(subMiddleware, data): Promise {
    // go through middleware and chain then functions!
    const middleware: Function[] = this.middleware.map((mw: Object) => mw[subMiddleware]);
    let latestPromise = Promise.resolve(data);
    for (const mw of middleware) {
      latestPromise = latestPromise.then(mw);
    }

    return latestPromise;
  }
}
