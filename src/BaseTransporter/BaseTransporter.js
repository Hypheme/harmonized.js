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

  create(item: Object) {
    PushQueue.createItem('create', item);
    this.pushOne(item.__id);
  }

  update(item: Object) {
    PushQueue.createItem('update', item);
    this.pushOne(item.__id);
  }

  delete(item: Object) {
    PushQueue.createItem('delete', item);
    this.pushOne(item.__id);
  }

  push() {
    const pushPromises = [];
    this._queues.getAllQueues().forEach((queue) => pushPromises.push(this._pushOne(queue)));
    return Promise.all(pushPromises);
  }

  _prepareSend(/* queueItem: PushQueueItem */) {
    throw new Error('should be implemented by the transporter');
  }

  _send(/* data: Object */) {
    throw new Error('should be implemented by the transporter');
  }

  _sendCurrentQueueItem(subQueue: PushQueueItem[]) {
    const queueItem = subQueue[0];
    queueItem.inProgress = true;
    const preparedSendRequest = this._prepareSend(subQueue[0]);

    // run send middleware then send and afterwards work off the queue
    const promise = queueItem.promise = constructor.runMiddleware('send', {
      req: preparedSendRequest,
      item: queueItem,
    })
      .then(this._send.bind(this))
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

  _fetch() {
    throw new Error('should be implemented by the transporter');
  }

  fetch(...args: any[]) {
    return this._fetch.apply(this, args);
  }

  _fetchOne(/* id: number */) {
    throw new Error('should be implemented by the transporter');
  }

  fetchOne(...args: any[]) {
    const arg = args[0];
    return (isObject(arg)) ? this._fetchOne(arg.id) : this._fetchOne(arg);
  }

  _initialFetch() {
    throw new Error('should be implemented by the transporter');
  }

  initialFetch(...args: any[]) {
    return this._initialFetch.apply(this, args);
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
