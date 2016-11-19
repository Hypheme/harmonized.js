import BaseQueueMiddleware from './BaseQueueMiddleware';

describe('Base Queue Middleware', function () {
  beforeEach(function () {
    this.baseQueueMiddleware = new BaseQueueMiddleware();
  });

  it('should init', function () {
    expect(BaseQueueMiddleware.uniqueName).toBe('BaseQueueMiddleware');
  });

  it('should item push to queue when queue is empty', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [],
      queueItem: {
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        payload: 'newItem',
      }],
      queueItem: {
        payload: 'newItem',
      },
    });
  });

  it('should push item to end of queue when first item is in progress', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        payload: 'oldItem',
        inProgress: true,
      }],
      queueItem: {
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        payload: 'oldItem',
        inProgress: true,
      }, {
        payload: 'newItem',
      }],
      queueItem: {
        payload: 'newItem',
      },
    });
  });

  it('should empty queue when item in queue is creating and new item is deleting', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'create',
        payload: 'olditem',
      }],
      queueItem: {
        action: 'delete',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [],
      queueItem: {
        action: 'delete',
        payload: 'newItem',
      },
    });
  });

  it('should delete "update" item in queue if new queue item action is "delete"', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'update',
        payload: 'olditem',
      }],
      queueItem: {
        action: 'delete',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        action: 'delete',
        payload: 'newItem',
      }],
      queueItem: {
        action: 'delete',
        payload: 'newItem',
      },
    });
  });

  it('should override "delete" queue item when new item has action "update"', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'delete',
        payload: 'olditem',
        shouldBe: 'replaced',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        action: 'update',
        payload: 'newItem',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });
  });

  it('should replace payload if old item action is "create" and new one is "update"', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'create',
        payload: 'olditem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        action: 'create',
        payload: 'newItem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });
  });

  it('should replace payload if old item action is "update" and new one is "update"', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'update',
        payload: 'olditem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        action: 'update',
        payload: 'newItem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'update',
        payload: 'newItem',
      },
    });
  });

  it('should do nothing in grotesque cases', function () {
    const nextState = this.baseQueueMiddleware.addItemToQueue({
      queue: [{
        action: 'delete',
        payload: 'olditem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'create',
        payload: 'newItem',
      },
    });

    expect(nextState).toEqual({
      queue: [{
        action: 'delete',
        payload: 'olditem',
        shouldNotBe: 'replaced',
      }],
      queueItem: {
        action: 'create',
        payload: 'newItem',
      },
    });
  });
});
