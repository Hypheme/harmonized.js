// @flow
import TransporterMiddleware from './TransporterMiddleware';
import PushQueueItem from '../BaseTransporter/PushQueueItem';

export default class BaseQueueMiddleware extends TransporterMiddleware {
  // init() {}

  addItemToQueue({ queueItem, queue }: { queueItem: PushQueueItem, queue: PushQueueItem[] }) {
    if (queue.length === 0 || queue[0].inProgress) {
      // queue is empty or a queue item is in progress, enqueue it
      queue.push(queueItem);
    } else if (queue[0].action === 'create' && queueItem.action === 'delete') {
      // item was not created yet and already deleted, delete create statement in queue
      // because nothing has to be send
      delete queue[0];
    } else if (queueItem.action === 'delete') {
      // item should be updated but newer entry deletes this, replace update with delete
      // queue item because old request is not needed because of delete
      queue[0] = queueItem;
    } else if (queue[0].action === 'delete' && queueItem.action === 'update') {
      // Item should be deleted but is changed to update => override with new "update"
      queue.splice(0, 1, queueItem);
    } else if (queue[0].action === 'create' || queue[0].action === 'update') {
      // old queue item was create or update, replace the old payload with the new one
      queue[0].payload = queueItem.payload;
    }

    return { queueItem, queue };
  }
}

BaseQueueMiddleware.name = 'BaseQueueMiddleware';
