// @flow
import PushQueue from './PushQueue';
import PushQueueItem from './PushQueueItem';
import TransporterMiddleware from '../TransporterMiddleware/TransporterMiddleware';

export default class BaseTransporter {
  static middleware: TransporterMiddleware[] = [];
  _queues: PushQueue;

  constructor() {
    this._queues = new PushQueue();
  }

  _addToQueue(queueItem: PushQueueItem) {
    const queue = this._queues.getQueue(queueItem.__id);
    return this.constructor.runMiddleware('addItemToQueue', {
      queueItem, queue,
    }).then(() => this._pushOne(queue));
  }

  create(item: Object) {
    return this._addToQueue(PushQueue.createItem('create', item));
  }

  update(item: Object) {
    return this._addToQueue(PushQueue.createItem('update', item));
  }

  delete(item: Object) {
    return this._addToQueue(PushQueue.createItem('delete', item));
  }

  push() {
    const pushPromises = [];
    this._queues.getAllQueues().forEach((queue) => pushPromises.push(this._pushOne(queue)));
    return Promise.all(pushPromises);
  }

  _prepareSend(/* queueItem: PushQueueItem */) {
    this._shouldBeImplemented();
  }

  _send(/* data: Object */) {
    this._shouldBeImplemented();
  }

  _sendCurrentQueueItem(queue: PushQueueItem[]) {
    const type = 'push';
    const queueItem = queue[0];
    queueItem.inProgress = true;
    const preparedSendRequest = this._prepareSend(queueItem);

    // run send middleware then send and afterwards work off the queue
    const promise = queueItem.promise = this.constructor.runMiddleware('send', {
      type,
      req: preparedSendRequest,
      item: queueItem,
    })
      .then(this._send.bind(this))
      // when error run transmissionError middleware
      .catch(({ res, req, error }) => {
        return this.constructor.runMiddleware('transmissionError', {
          type, req, res, error, queue,
        }).then(() => Promise.reject({ res, req, error }));
      })
      .then(({ res, req }) => this.constructor.runMiddleware('receive', {
        type, req, res, queue,
      }))
      .then(({ res }) => {
        queue.shift();
        if (queue.length > 0) {
          return this._sendCurrentQueueItem(queue);
        }

        return res;
      });

    return promise;
  }

  _pushOne(queue: PushQueueItem[]) {
    const queueItem = queue[0];
    if (queueItem.inProgress) {
      return queueItem.promise;
    }

    return this._sendCurrentQueueItem(queue);
  }

  pushOne(__id: string) {
    const queue = this._queues.getQueue(__id);
    return this._pushOne(queue);
  }

  _runFetchWithMiddleware(type: string, prepareMethod: Function,
    fetchMethod: Function, args: any[]) {
    const preparedRequest = prepareMethod.apply(this, args);

    // run send middleware
    return this.constructor.runMiddleware('send', {
      type,
      req: preparedRequest,
    })
      .then(fetchMethod.bind(this))
      // when error run transmissionError middleware
      .catch(({ res, req, error }) => {
        return this.constructor.runMiddleware('transmissionError', { type, req, res, error })
          .then(() => Promise.reject({ res, req, error }));
      })
      // run receive middleware
      .then(({ res, req }) => this.constructor.runMiddleware('receive', { type, req, res }));
  }

  _shouldBeImplemented() {
    throw new Error('should be implemented by the transporter');
  }

  _prepareFetch() {
    this._shouldBeImplemented();
  }

  _fetch() {
    this._shouldBeImplemented();
  }

  fetch(...args: any[]) {
    return this._runFetchWithMiddleware('fetch', this._prepareFetch,
      this._fetch, args);
  }

  _prepareFetchOne() {
    this._shouldBeImplemented();
  }

  _fetchOne(/* id: number */) {
    this._shouldBeImplemented();
  }

  fetchOne(...args: any[]) {
    return this._runFetchWithMiddleware('fetchOne', this._prepareFetchOne,
      this._fetchOne, args);
  }

  _prepareInitialFetch() {
    this._shouldBeImplemented();
  }

  _initialFetch() {
    this._shouldBeImplemented();
  }

  initialFetch(...args: any[]) {
    return this._runFetchWithMiddleware('initialFetch', this._prepareInitialFetch,
      this._initialFetch, args);
  }

  static add(mw) {
    this.middleware.push(mw);
  }

  static runMiddleware(subMiddleware, data) {
    // go through middleware and chain then functions!
    const middleware: Function[] = this.middleware.map((mw: Object) => mw[subMiddleware]);
    let latestPromise = Promise.resolve(data);
    for (const mw of middleware) {
      latestPromise = latestPromise.then(mw);
    }

    return latestPromise;
  }
}
