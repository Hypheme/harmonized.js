// const MockQueueItem = function MockQueueItem(action, payload) {
//   console.log('should be called', action, payload);
//   return { action, payload };
// };

import PushQueue from './PushQueue';

describe('PushQueue', function () {
  beforeEach(function () {
    // console.log('wheee', PushQueueRewireApi);
    // console.log('rerererewire', PushQueue.__Rewire__);
    // console.log('rewire', PushQueueRewireApi.__Rewire__);
    // PushQueue.__Rewire__('PushQueueItem', MockQueueItem);
    this.queue = new PushQueue();
  });

  afterEach(function () {
    // PushQueue.__ResetDependency__('PushQueueItem');
  });

  it('should get existing queue items for a given runtime ID', function () {
    const expectedQueue = ['some', 'items'];
    this.queue._queue = {
      123: expectedQueue,
    };

    const returnedQueue = this.queue.getQueue(123);
    expect(returnedQueue).toBe(expectedQueue);
  });

  it('should get a new queue when requesting a queue that is not there yet', function () {
    this.queue._queue = {
      123: ['some', 'other', 'queue'],
    };

    const returnedQueue = this.queue.getQueue(124);
    expect(returnedQueue).toEqual([]);
    expect(returnedQueue).toBe(this.queue._queue[124]);
  });

  it('should remove queue', function () {
    this.queue._queue = {
      122: ['some', 'queue'],
      123: ['some', 'other', 'queue'],
    };

    this.queue.removeQueue(122);
    expect(this.queue._queue).toEqual({
      123: ['some', 'other', 'queue'],
    });
  });

  xit('should create a new queue item', function () {
    const createdItem = PushQueue.createItem('create', {
      id: 123,
      _id: 124,
      payload: 'some',
    });
    expect(createdItem).toEqual({
      action: 'create',
      payload: {
        id: 123,
        _id: 124,
        payload: 'some',
      },
    });
  });
});
