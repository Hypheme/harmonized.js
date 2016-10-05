// @flow
import PushQueueItem from './PushQueueItem';

export default class PushQueue {
  _queue: Map = new Map();

  static createItem(action, payload) {
    return new PushQueueItem(action, payload);
  }

  getQueue(runtimeId: string) {
    const queue = this._queue.get(runtimeId);
    if (queue) {
      return queue;
    }

    // When queue is not there, create a new queue
    const newQueue: PushQueueItem[] = [];
    this._queue.set(runtimeId, newQueue);
    return newQueue;
  }

  removeQueue(runtimeId: number) {
    this._queue.delete(runtimeId);
  }
}
