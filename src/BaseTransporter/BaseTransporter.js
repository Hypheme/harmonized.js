// @flow
import isObject from 'lodash';
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
    return constructor.runMiddleware('addItemToQueue', {
      queueItem, queue,
    }).then(() => this._pushOne(queue));
  }

  create(item: Object) {
    PushQueue.createItem('create', item);
    return this._addToQueue(item);
  }

  update(item: Object) {
    PushQueue.createItem('update', item);
    return this._addToQueue(item);
  }

  delete(item: Object) {
    PushQueue.createItem('delete', item);
    return this._addToQueue(item);
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

  _sendCurrentQueueItem(subQueue: PushQueueItem[]) {
    const type = 'push';
    const queueItem = subQueue[0];
    queueItem.inProgress = true;
    const preparedSendRequest = this._prepareSend(subQueue[0]);

    // run send middleware then send and afterwards work off the queue
    const promise = queueItem.promise = constructor.runMiddleware('send', {
      type,
      req: preparedSendRequest,
      item: queueItem,
    })
      .then(this._send.bind(this))
      // when error run transmissionError middleware
      .fail(({ res, req }) => constructor.runMiddleware('transmissionError', { type, req, res }))
      .then(({ res, req }) => constructor.runMiddleware('receive', { type, req, res }))
      .then((res) => {
        subQueue.shift();
        if (subQueue.length > 0) {
          return this._sendCurrentQueueItem(subQueue);
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
    return constructor.runMiddleware('send', {
      type,
      req: preparedRequest,
    })
      .then(fetchMethod.bind(this))
      // when error run transmissionError middleware
      .fail(({ res, req }) => constructor.runMiddleware('transmissionError', { type, req, res }))
      // run receive middleware
      .then(({ res, req }) => constructor.runMiddleware('receive', { type, req, res }));
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
    args[0] = (isObject(args[0])) ? args[0].id : args[0];
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
