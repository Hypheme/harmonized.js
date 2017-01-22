// @flow
import Store from './Store';
import TransactionItem from './TransactionItem';
import TransporterMiddleware from './TransporterMiddleware/TransporterMiddleware';
import { ROLE } from './constants';

type Role = ROLE.CLIENT_STORAGE | ROLE.TRANSPORTER;

export default class BaseTransporter {
  static middleware: TransporterMiddleware[] = [];
  static TransactionItem: TransactionItem = TransactionItem;

  initialFetchStrategy: Function;
  _store: Store;
  _role: Role;

  constructor(options: Object = {}) {
    if (options.initialFetchStrategy) {
      this.initialFetchStrategy = options.initialFetchStrategy;
    }
  }

  setEnvironment({ store, role }: {
    store: Store,
    role: Role,
  }) {
    this._store = store;
    this._role = role;
  }

  init() {}

  _shouldBeImplemented() {
    throw new Error('should be implemented by the transporter');
  }

  create(data: Object) {
    return this._sendRequest(new BaseTransporter.TransactionItem('create', data));
  }

  update(data: Object) {
    return this._sendRequest(new BaseTransporter.TransactionItem('update', data));
  }

  delete(data: Object) {
    return this._sendRequest(new BaseTransporter.TransactionItem('delete', data));
  }

  fetch(data: Object) {
    return this._sendRequest(new BaseTransporter.TransactionItem('fetch', data));
  }

  fetchAll() {
    return this._sendRequest(new BaseTransporter.TransactionItem('fetchAll', {}));
  }

  initialFetch(inputArray: Object[]) {
    return this.initialFetchStrategy(inputArray);
  }

  onceAvailable() {
    this._shouldBeImplemented();
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
    return this.constructor.runMiddleware('send', { req: preparedReq })
      .then(this._request.bind(this))
      // when error run transmissionError middleware
      .catch(({ error, req }) => this.constructor
        .runMiddleware('transmissionError', { action, req, error })
        .then(() => Promise.reject({ error, req })))
      .then(({ status, data, res, req }) => this.constructor.runMiddleware('receive',
        { action, status, data, req, res }))
      .then(({ status, data }) => ({ status, data }));
  }

  static add(mw) {
    if (mw.replaces) {
      const foundId = this.middleware.findIndex(thisMw => thisMw.name === mw.replaces);
      if (foundId === -1) {
        throw new Error(
          `The middleware "${mw.replaces}" could not be replaced because it can't be found`,
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
