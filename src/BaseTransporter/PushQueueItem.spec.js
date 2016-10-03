import PushQueueItem from './PushQueueItem';

describe('PushQueueItem', function () {
  beforeEach(function () {

  });

  it('should create a new push queue item', function () {
    const pushQueueItem = new PushQueueItem('create', {
      id: 123,
      _id: 1,
      __id: 1234,
      pay: 'load',
    });
    expect(pushQueueItem.action).toBe('create');
    expect(pushQueueItem.id).toBe(123);
    expect(pushQueueItem._id).toBe(1);
    expect(pushQueueItem.__id).toBe(1234);
    expect(pushQueueItem.payload).toEqual({
      id: 123,
      _id: 1,
      __id: 1234,
      pay: 'load',
    });
  });
});
