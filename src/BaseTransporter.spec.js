import BaseTransporter from './BaseTransporter';

describe('BaseTransporter', function () {
  let TestTransporter;

  beforeEach(function () {
    class BfeTestTransporter extends BaseTransporter {
      static middleware = [...BaseTransporter.middleware];
      _prepareSend = jasmine.createSpy('_prepareSend');
      _send = jasmine.createSpy('_send');
      _prepareFetch = jasmine.createSpy('_prepareFetch');
      _fetch = jasmine.createSpy('_fetch');
      _prepareSend = jasmine.createSpy(' _prepareSend');
      _fetchOne = jasmine.createSpy('_fetchOne');
      _prepareInitialFetch = jasmine.createSpy('_prepareInitialFetch');
      _initialFetch = jasmine.createSpy('_initialfetch');
    }

    TestTransporter = BfeTestTransporter;
    this.TransactionItemMock = jasmine.createSpy('TransactionItem');
    // BaseTransporter.__Rewire__('TransactionItem', this.TransactionItemMock);
    this.testTransporter = new TestTransporter('uuid');
    BaseTransporter.TransactionItem = this.TransactionItemMock;

    expect(TestTransporter.middleware instanceof Array).toBe(true);
    TestTransporter.middleware = [];
  });

  it('should add middleware', function () {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add('super awesome middleware');
    expect(TestTransporter.middleware).toEqual(['super awesome middleware']);
  });

  it('should replace existing middleware', function () {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add({
      name: 'theOtherMiddleware',
    });
    TestTransporter.add({
      name: 'superAwesomeMiddleware',
    });
    TestTransporter.add({
      name: 'theLastMiddleware',
    });

    expect(TestTransporter.middleware).toEqual([{
      name: 'theOtherMiddleware',
    }, {
      name: 'superAwesomeMiddleware',
    }, {
      name: 'theLastMiddleware',
    }]);

    TestTransporter.add({
      name: 'theNewReplacementMiddleware',
      replaces: 'superAwesomeMiddleware',
    });

    expect(TestTransporter.middleware).toEqual([{
      name: 'theOtherMiddleware',
    }, {
      name: 'theNewReplacementMiddleware',
      replaces: 'superAwesomeMiddleware',
    }, {
      name: 'theLastMiddleware',
    }]);
  });

  it('should fail to replace non existing middleware', function () {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add({
      name: 'theOtherMiddleware',
    });
    TestTransporter.add({
      name: 'superAwesomeMiddleware',
    });
    TestTransporter.add({
      name: 'theLastMiddleware',
    });

    expect(TestTransporter.middleware).toEqual([{
      name: 'theOtherMiddleware',
    }, {
      name: 'superAwesomeMiddleware',
    }, {
      name: 'theLastMiddleware',
    }]);

    expect(() => {
      TestTransporter.add({
        name: 'theNewReplacementMiddleware',
        replaces: 'notExistingMiddleware',
      });
    }).toThrowError('The middleware "notExistingMiddleware" could not be replaced ' +
      'because it can\'t be found');

    expect(TestTransporter.middleware).toEqual([{
      name: 'theOtherMiddleware',
    }, {
      name: 'superAwesomeMiddleware',
    }, {
      name: 'theLastMiddleware',
    }]);
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
      .then((data) => {
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
      .then((data) => {
        expect(data).toEqual({ some: 'data' });
        expect(TestTransporter.middleware.length).toBe(1);
        expect(TestTransporter.middleware[0].receive).not.toHaveBeenCalled();
        done();
      });
  });

  it('should run sub middleware with matching middleware', function (done) {
    expect(TestTransporter.middleware).toEqual([]);
    TestTransporter.add({
      send: data => new Promise((resolve) => {
        const dataClone = { ...data };
        dataClone.addedData = 'is available';
        resolve(dataClone);
      }),
    });

    const inputData = { some: 'data' };
    TestTransporter.runMiddleware('send', inputData)
      .then((data) => {
        expect(data).toEqual({
          some: 'data',
          addedData: 'is available',
        });
        expect(data).not.toBe(inputData);
        done();
      });
  });

  it('should succeed to create and send a transmission item',
    function (done) {
      this.TransactionItemMock.and.returnValue({
        action: 'create',
        payload: {},
      });

      spyOn(TestTransporter, 'runMiddleware').and.callThrough();
      let resolve;

      const promise = new Promise((_resolve) => {
        resolve = _resolve;
      });

      spyOn(this.testTransporter, '_request').and.returnValue(promise);
      spyOn(this.testTransporter, '_prepareRequest').and.returnValue({
        prepared: 'item',
      });

      this.testTransporter.create({
        someNew: 'item',
      }).then((returnedData) => {
        expect(TestTransporter.runMiddleware).toHaveBeenCalledTimes(2);

        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('send', {
          req: { prepared: 'item' },
        });

        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('receive', {
          action: 'create',
          res: 'res',
          req: 'req',
          data: 'data',
          status: 'status',
        });

        expect(returnedData).toEqual({
          data: 'data',
          status: 'status',
        });

        done();
      });

      setTimeout(() => {
        // Send middleware run
        expect(TestTransporter.runMiddleware.calls.count()).toBe(1);

        expect(this.testTransporter._request).toHaveBeenCalled();
        expect(this.testTransporter._request.calls.count()).toBe(1);
        resolve({
          res: 'res',
          req: 'req',
          status: 'status',
          data: 'data',
        });
      });
    });

  it('should get a transmission error when trying to create and send a transmission item',
    function (done) {
      this.TransactionItemMock.and.returnValue({
        action: 'create',
        payload: {},
      });

      spyOn(TestTransporter, 'runMiddleware').and.callThrough();
      let reject;

      const promise = new Promise((_resolve, _reject) => {
        reject = _reject;
      });

      spyOn(this.testTransporter, '_request').and.returnValue(promise);
      spyOn(this.testTransporter, '_prepareRequest').and.returnValue({
        prepared: 'item',
      });

      this.testTransporter.create({
        someNew: 'item',
      }).catch((returnedData) => {
        expect(TestTransporter.runMiddleware).toHaveBeenCalledTimes(2);

        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('send', {
          req: {
            prepared: 'item',
          },
        });

        expect(TestTransporter.runMiddleware).not.toHaveBeenCalledWith('receive',
          {});
        expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('transmissionError', {
          action: 'create',
          req: 'req',
          error: 'message',
        });

        expect(TestTransporter.runMiddleware.calls.count()).toBe(2);
        expect(returnedData).toEqual({
          req: 'req',
          error: 'message',
        });
        done();
      });

      setTimeout(() => {
        // Send middleware run
        expect(TestTransporter.runMiddleware.calls.count()).toBe(1);

        expect(this.testTransporter._request).toHaveBeenCalled();
        expect(this.testTransporter._request.calls.count()).toBe(1);
        reject({
          res: 'res',
          req: 'req',
          error: 'message',
        });
      });
    });

  it('should update an item and send the request', function () {
    this.TransactionItemMock.and.callFake((action, data) => {
      expect(action).toBe('update');
      expect(data).toEqual({
        someUpdated: 'item',
      });
    });

    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const updateReturn = this.testTransporter.update({
      someUpdated: 'item',
    });
    expect(updateReturn).toBe('return value');
    expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(
      jasmine.any(this.TransactionItemMock));
    expect(this.testTransporter._sendRequest).toHaveBeenCalledTimes(1);
  });

  it('should delete am item and send the request', function () {
    this.TransactionItemMock.and.callFake((action, data) => {
      expect(action).toBe('delete');
      expect(data).toEqual({
        someDeleted: 'item',
      });
    });

    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const deleteReturn = this.testTransporter.delete({
      someDeleted: 'item',
    });
    expect(deleteReturn).toBe('return value');
    expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(
      jasmine.any(this.TransactionItemMock));
    expect(this.testTransporter._sendRequest).toHaveBeenCalledTimes(1);
  });

  it('should fetch one item and send the request', function () {
    this.TransactionItemMock.and.callFake((action, data) => {
      expect(action).toBe('fetch');
      expect(data).toEqual({
        someItemToBe: 'fetched',
      });
    });

    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const fetchReturn = this.testTransporter.fetch({
      someItemToBe: 'fetched',
    });
    expect(fetchReturn).toBe('return value');
    expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(
      jasmine.any(this.TransactionItemMock));
    expect(this.testTransporter._sendRequest).toHaveBeenCalledTimes(1);
  });

  it('should fetch all items and send the request', function () {
    this.TransactionItemMock.and.callFake((action, data) => {
      expect(action).toBe('fetchAll');
      expect(data).toEqual({});
    });

    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const fetchAllReturn = this.testTransporter.fetchAll();
    expect(fetchAllReturn).toBe('return value');
    expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(
      jasmine.any(this.TransactionItemMock));
    expect(this.testTransporter._sendRequest).toHaveBeenCalledTimes(1);
  });

  it('should do initial fetch all items and send the request', function () {
    this.TransactionItemMock.and.callFake((action, data) => {
      expect(action).toBe('initialFetch');
      expect(data).toEqual({ inputArray: ['a', 'b', 'c'] });
    });

    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const initialFetchReturn = this.testTransporter.initialFetch(['a', 'b', 'c']);
    expect(initialFetchReturn).toBe('return value');
    expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(
      jasmine.any(this.TransactionItemMock));
    expect(this.testTransporter._sendRequest).toHaveBeenCalledTimes(1);
  });

  it('should throw an error when interface methods are not implemented', function () {
    class NotImplementedTransporter extends BaseTransporter {}

    const transporter = new NotImplementedTransporter();
    expect(() => {
      transporter.onceAvailable();
    }).toThrowError('should be implemented by the transporter');

    expect(() => {
      transporter._prepareRequest();
    }).toThrowError('should be implemented by the transporter');

    expect(() => {
      transporter._request();
    }).toThrowError('should be implemented by the transporter');

    expect(() => {
      transporter._mergeInitialFetchArrays();
    }).toThrowError('should be implemented by the transporter');
  });
});
