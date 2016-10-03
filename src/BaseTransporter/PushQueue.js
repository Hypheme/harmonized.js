// @flow
import TransporterMiddleware from '../TransporterMiddleware/TransporterMiddleware';
import PushQueueItem from './PushQueueItem';

export default class PushQueue {
  _queue: Array<PushQueueItem> = [];

  static createItem(action, payload) {
    console.log('pushi', PushQueueItem);
    return new PushQueueItem(action, payload);
  }

  getQueue(runtimeId: number) {
    const queue = this._queue[runtimeId];
    if (queue) {
      return queue;
    }

    // When queue is not there, create a new queue
    this._queue[runtimeId] = [];
    return this._queue[runtimeId];
  }

  removeQueue(runtimeId: number) {
    delete this._queue[runtimeId];
  }
}
