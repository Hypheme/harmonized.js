// @flow
import TransactionItem from './TransactionItem';
import TransporterMiddleware from '../TransporterMiddleware/TransporterMiddleware';

export default class BaseTransporter {
  static middleware: TransporterMiddleware[] = [];

  _shouldBeImplemented() {
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

  fetchAll(data: Object) {
    return this._sendRequest(new TransactionItem('fetchAll', data));
  }

  initialFetch(data: Object) {
    return this._sendRequest(new TransactionItem('initialFetch', data));
  }

  _prepareRequest(/* item: TransactionItem */) {
    this._shouldBeImplemented();
  }

  _request(/* data: Object */) {
    this._shouldBeImplemented();
  }

  _sendRequest(item: TransactionItem) {
    const preparedReq = this._prepareRequest(item);
    const action = item.action;

    // run send middleware then send and afterwards work off the queue
    return this.constructor.runMiddleware('send', { action, req: preparedReq })
      .then(this._request.bind(this))
      // when error run transmissionError middleware
      .catch(({ res, req, error }) => this.constructor
        .runMiddleware('transmissionError', { action, req, res, error })
        .then(() => Promise.reject({ res, req, error })))
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
