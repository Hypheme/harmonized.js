import BaseTransporter from './BaseTransporter';
import TransactionItem, { __RewireAPI__ as TransactionItemRewire } from './TransactionItem';

class TestTransporter extends BaseTransporter {
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

describe('BaseTransporter', function () {
  beforeEach(function () {
    console.log(TransactionItem.__Rewire__);
    console.log(TransactionItemRewire);
    console.log('------');
    this.testTransporter = new TestTransporter();

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
    }).toThrowError('The middleware "notExistingMiddleware" could not be replaced because it can\'t be found');


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

  it('should get a transmission error when trying to create and send a transmission item',
    function (done) {
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
        expect(TestTransporter.runMiddleware).not.toHaveBeenCalledWith('receive',
          jasmine.any(Object));
        // expect(TestTransporter.runMiddleware).toHaveBeenCalledWith('transmissionError', {
        //   type: 'push',
        //   res: 'res',
        //   req: 'req',
        //   error: 'message',
        // });

        expect(TestTransporter.runMiddleware.calls.count()).toBe(2);
        expect(returnedData).toEqual({
          res: 'res',
          req: 'req',
          error: 'message',
        });
        done();
      });

      setTimeout(() => {
        // expect(this.testTransporter._prepareRequest).toHaveBeenCalledWith(this.queueCreatedItem);

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
    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const updateReturn = this.testTransporter.update({
      someUpdated: 'item',
    });
    expect(updateReturn).toBe('return value');
    // expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(this.queueCreatedItem);
  });

  it('should delete am item and send the request', function () {
    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const deleteReturn = this.testTransporter.delete({
      someDeleted: 'item',
    });
    expect(deleteReturn).toBe('return value');
    // expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(this.queueCreatedItem);
  });

  it('should fetch one item and send the request', function () {
    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const fetchReturn = this.testTransporter.fetch({
      someItemToBe: 'fetched',
    });
    expect(fetchReturn).toBe('return value');
    // expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(this.queueCreatedItem);
  });

  it('should fetch all items and send the request', function () {
    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const fetchAllReturn = this.testTransporter.fetchAll();
    expect(fetchAllReturn).toBe('return value');
    // expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(this.queueCreatedItem);
  });

  it('should do initial fetch all items and send the request', function () {
    spyOn(this.testTransporter, '_sendRequest').and.returnValue('return value');
    const initialFetchReturn = this.testTransporter.initialFetch();
    expect(initialFetchReturn).toBe('return value');
    // expect(this.testTransporter._sendRequest).toHaveBeenCalledWith(this.queueCreatedItem);
  });
});
