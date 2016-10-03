// @flow
import PushQueue from './PushQueue';
import PushQueueItem from './PushQueueItem';
import TransporterMiddleware from '../TransporterMiddleware/TransporterMiddleware';

export default class BaseTransporter {
  static middleware: TransporterMiddleware[] = [];
  _queue: PushQueue;

  constructor() {
    this._queue = new PushQueue();
  }

  create(item: Object) {
    PushQueue.createItem('create', item);
  }

  update(item: Object) {
    PushQueue.createItem('update', item);
  }

  delete(item: Object) {
    PushQueue.createItem('delete', item);
  }

  push() {
    const pushPromises = [];
    for (const __id: string in this._queue._queue) {
      if (this._queue._queue.hasOwnProperty(__id)) {
        pushPromises.push(this.pushOne(__id));
      }
    }

    return Promise.all(pushPromises);
  }

  _prepareSend(queueItem: PushQueueItem) {
    throw new Error('should be implemented by the transporter');
  }

  _send(data: Object) {
    throw new Error('should be implemented by the transporter');
  }

  _sendCurrentQueueItem(subQueue: PushQueueItem[], promise: Promise,
    resolve: Function, reject: Function) {
    const queueItem = subQueue[0];
    queueItem.inProgress = true;
    queueItem.promise = promise;
    const preparedSendRequest = this._prepareSend(subQueue[0]);
    this.constructor.runMiddleware('send', {
      req: preparedSendRequest,
      item: queueItem,
    }).then(this._send.bind(this))
    .then((res) => {
      subQueue.shift();
      if (subQueue.length === 0) {
        resolve(res);
      } else {
        this._sendCurrentQueueItem(subQueue, promise, resolve, reject);
      }
    });
  }

  pushOne(__id: string) {
    const subQueue = this._queue.getQueue(__id);
    const queueItem = subQueue[0];
    if (queueItem.inProgress) {
      return queueItem.promise;
    }

    const promise = new Promise((resolve, reject) => {
      this._sendCurrentQueueItem(subQueue, promise, resolve, reject);
    });

    return promise;
  }

  fetch() {

  }

  fetchOne() {
    // arg[0] = id|object
  }

  initialFetch() {

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
