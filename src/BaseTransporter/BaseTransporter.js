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
