import BaseTransporter from './BaseTransporter';
import PushQueue from './PushQueue';

class TestTransporter extends BaseTransporter {
  static middleware = [...BaseTransporter.middleware];
  _prepareSend = jasmine.createSpy('_prepareSend');
  _send = jasmine.createSpy('_send');
  _prepareFetch = jasmine.createSpy('_prepareFetch');
  _fetch = jasmine.createSpy('_fetch');
  _prepareFetchOne = jasmine.createSpy('_prepareFetchOne');
  _fetchOne = jasmine.createSpy('_fetchOne');
  _prepareInitialFetch = jasmine.createSpy('_prepareInitialFetch');
  _initialFetch = jasmine.createSpy('_initialfetch');
}

fdescribe('BaseTransporter', function () {
  beforeEach(function () {
    this.testTransporter = new TestTransporter();
    expect(this.testTransporter._queues instanceof PushQueue).toBe(true);
    this.testTransporter._queues = jasmine.createSpyObj([
      'getAllQueues',
      'getQueue',
      'removeQueue',
    ]);

    expect(TestTransporter.middleware instanceof Array).toBe(true);
    TestTransporter.middleware = [];

    this.queueCreatedItem = {
      __id: 9001,
      name: 'a queue item',
    };
    spyOn(PushQueue, 'createItem').and.returnValue(this.queueCreatedItem);
  });

  it('should add middleware', function () {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add('super awesome middleware');
    expect(TestTransporter.middleware).toEqual(['super awesome middleware']);
  });

  it('should have extended classes with own middleware', function () {
    TestTransporter.middleware.push('some base middleware');

    class SuperTestTransporter extends TestTransporter {
      static middleware = TestTransporter.middleware.slice();
    }

    expect(SuperTestTransporter.middleware.length).toBe(1);
    SuperTestTransporter.add('some extended middleware');
    expect(SuperTestTransporter.middleware).not.toBe(TestTransporter.middleware);
    expect(SuperTestTransporter.middleware.length).toBe(2);
    expect(TestTransporter.middleware.length).toBe(1);
  });

  it('should run sub middleware with no middleware', function (done) {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.runMiddleware('send', { some: 'data' })
      .then(data => {
        expect(data).toEqual({ some: 'data' });
        done();
      });
  });

  it('should run sub middleware with no matching middleware', function (done) {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add({
      receive: jasmine.createSpy('receive middleware'),
    });
    TestTransporter.runMiddleware('send', { some: 'data' })
      .then(data => {
        expect(data).toEqual({ some: 'data' });
        expect(TestTransporter.middleware.length).toBe(1);
        expect(TestTransporter.middleware[0].receive).not.toHaveBeenCalled();
        done();
      });
  });

  it('should run sub middleware with matching middleware', function (done) {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add({
      send: (data) => new Promise((resolve) => {
        const dataClone = { ...data };
        dataClone.addedData = 'is available';
        resolve(dataClone);
      }),
    });

    const inputData = { some: 'data' };
    TestTransporter.runMiddleware('send', inputData)
      .then(data => {
        expect(data).toEqual({
          some: 'data',
          addedData: 'is available',
        });
        expect(data).not.toBe(inputData);
        done();
      });
  });

  it('should create a queue item and add to queue', function (done) {
    spyOn(TestTransporter, 'runMiddleware').and.callThrough();
    this.testTransporter._queues.getQueue.and.returnValue([this.queueCreatedItem]);
    let resolve;

    const promise = new Promise((_resolve) => {
      resolve = _resolve;
    });

    this.testTransporter._send.and.returnValue(promise);
    this.testTransporter._prepareSend.and.returnValue({
      prepared: 'item',
    });

    this.testTransporter.create({
      someNew: 'item',
    }).then((returnedData) => {
      expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('receive', {
        type: 'push',
        req: 'req',
        res: 'res',
        queue: [],
      });

      expect(TestTransporter.runMiddleware.calls.count()).toBe(3);
      expect(returnedData).toBe('res');
      done();
    });

    expect(PushQueue.createItem).toHaveBeenCalledWith('create', {
      someNew: 'item',
    });

    setTimeout(() => {
      expect(this.testTransporter._prepareSend).toHaveBeenCalledWith(this.queueCreatedItem);
      expect(this.queueCreatedItem.promise instanceof Promise).toBe(true);
      expect(this.queueCreatedItem.inProgress).toBe(true);

      // Add item to queue middleware run
      expect(this.testTransporter._queues.getQueue).toHaveBeenCalledWith(9001);
      expect(this.testTransporter._queues.getQueue.calls.count()).toBe(1);
      expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('addItemToQueue', {
        queueItem: this.queueCreatedItem,
        queue: [this.queueCreatedItem],
      });

      // Send middleware run
      expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('send', {
        type: 'push',
        req: {
          prepared: 'item',
        },
        item: this.queueCreatedItem,
      });

      expect(TestTransporter.runMiddleware.calls.count()).toBe(2);


      expect(this.testTransporter._send).toHaveBeenCalled();
      expect(this.testTransporter._send.calls.count()).toBe(1);
      resolve({
        req: 'req',
        res: 'res',
      });
    });
  });

  it('should get a transmission error when trying to create and send a queue item',
    function (done) {
      spyOn(TestTransporter, 'runMiddleware').and.callThrough();
      this.testTransporter._queues.getQueue.and.returnValue([this.queueCreatedItem]);
      let resolve;

      const promise = new Promise((_resolve) => {
        resolve = _resolve;
      });

      this.testTransporter._send.and.returnValue(promise);
      this.testTransporter._prepareSend.and.returnValue({
        prepared: 'item',
      });

      this.testTransporter.create({
        someNew: 'item',
      }).then((returnedData) => {
        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('receive', {
          type: 'push',
          req: 'req',
          res: 'res',
          queue: [],
        });

        expect(TestTransporter.runMiddleware.calls.count()).toBe(3);
        expect(returnedData).toBe('res');
        done();
      });

      expect(PushQueue.createItem).toHaveBeenCalledWith('create', {
        someNew: 'item',
      });

      setTimeout(() => {
        expect(this.testTransporter._prepareSend).toHaveBeenCalledWith(this.queueCreatedItem);
        expect(this.queueCreatedItem.promise instanceof Promise).toBe(true);
        expect(this.queueCreatedItem.inProgress).toBe(true);

      // Add item to queue middleware run
        expect(this.testTransporter._queues.getQueue).toHaveBeenCalledWith(9001);
        expect(this.testTransporter._queues.getQueue.calls.count()).toBe(1);
        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('addItemToQueue', {
          queueItem: this.queueCreatedItem,
          queue: [this.queueCreatedItem],
        });

      // Send middleware run
        expect(TestTransporter.runMiddleware.calls.count()).toBe(2);

        expect(this.testTransporter._send).toHaveBeenCalled();
        expect(this.testTransporter._send.calls.count()).toBe(1);
        resolve({
          req: 'req',
          res: 'res',
        });
      });
    });

  it('should update a queue item and add to queue', function () {
    spyOn(this.testTransporter, '_addToQueue').and.returnValue('return value');
    const updateReturn = this.testTransporter.update({
      someUpdated: 'item',
    });
    expect(updateReturn).toBe('return value');
    expect(this.testTransporter._addToQueue).toHaveBeenCalledWith(this.queueCreatedItem);
    expect(PushQueue.createItem).toHaveBeenCalledWith('update', {
      someUpdated: 'item',
    });
    expect(PushQueue.createItem.calls.count()).toBe(1);
  });

  it('should delete a queue item and add to queue', function () {
    spyOn(this.testTransporter, '_addToQueue').and.returnValue('return value');
    const deleteReturn = this.testTransporter.delete({
      someDeleted: 'item',
    });
    expect(deleteReturn).toBe('return value');
    expect(this.testTransporter._addToQueue).toHaveBeenCalledWith(this.queueCreatedItem);
    expect(PushQueue.createItem).toHaveBeenCalledWith('delete', {
      someDeleted: 'item',
    });
    expect(PushQueue.createItem.calls.count()).toBe(1);
  });

  it('should push all items to transporter endpoint', function (done) {
    const promises = [];
    const promiseActions = [];
    spyOn(this.testTransporter, '_pushOne').and.callFake(() => {
      const newPromise = new Promise((resolve, reject) => {
        promiseActions.push({
          resolve, reject,
        });
      });
      promises.push(newPromise);
    });

    this.testTransporter._queues.getAllQueues.and.returnValue([
      'q1', 'q2', 'q3', 'q4',
    ]);

    this.testTransporter.push()
      .then(() => {
        done();
      });

    expect(this.testTransporter._pushOne.calls.count()).toBe(4);

    for (let i = 0; i < promiseActions.length; i++) {
      promiseActions[i].resolve();
    }

    // TODO: mock "getAllQueues" to return array of promises
    // and check if all promise is fired when all promises are resolved
  });

  it('should push one item to transporter endpoint', function () {
    spyOn(this.testTransporter, '_pushOne').and.returnValue('return push value');
    this.testTransporter._queues.getQueue.and.returnValue('superqueue');
    expect(this.testTransporter.pushOne('1234')).toBe('return push value');
    expect(this.testTransporter._pushOne).toHaveBeenCalledWith('superqueue');
    expect(this.testTransporter._queues.getQueue).toHaveBeenCalledWith('1234');
  });

  it('should push one item to transporter endpoint when item is already in progress', function () {
    spyOn(this.testTransporter, '_sendCurrentQueueItem');
    this.testTransporter._queues.getQueue.and.returnValue([{
      __id: 9001,
      name: 'some queue item',
      inProgress: true,
      promise: 'fake promise',
    }, {
      __id: 9001,
      name: 'some updated queue item',
    }]);

    expect(this.testTransporter.pushOne(9001)).toBe('fake promise');
    expect(this.testTransporter._sendCurrentQueueItem).not.toHaveBeenCalled();
  });

  xit('should fetch all items', function () {

  });

  xit('should fetch one item', function () {

  });

  xit('should do initial fetch', function () {

  });
});
