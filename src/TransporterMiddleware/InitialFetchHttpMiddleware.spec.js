import InitialFetchHttpMiddleware from './InitialFetchHttpMiddleware';

describe('InitialFetchHttpMiddleware', function () {
  beforeEach(function () {
    this.middleware = new InitialFetchHttpMiddleware();
  });

  it('should manipulate initial fetch receive', function () {
    const newReceiveData = this.middleware.receive({
      action: 'initialFetch',
      data: [{
        uuid: 122,
        name: 'Franz',
      }, {
        uuid: 123,
        name: 'Hans',
      }, {
        uuid: 124,
        name: 'Lanz',
      }],
      item: {
        inputArray: [{
          uuid: 123,
          name: 'Klaus',
        }, {
          uuid: 125,
          name: 'Heinz',
        }],
      },
      meta: {
        key: 'uuid',
      },
    });

    expect(newReceiveData).toEqual([{
      uuid: 122,
      name: 'Franz',
    }, {
      uuid: 123,
      name: 'Hans',
    }, {
      uuid: 124,
      name: 'Lanz',
    }, {
      uuid: 125,
      name: 'Heinz',
    }]);
  });

  it('should not manipulate fetch receive', function () {
    const newReceiveData = this.middleware.receive({
      action: 'fetch',
      data: [{
        uuid: 122,
        name: 'Franz',
      }, {
        uuid: 123,
        name: 'Hans',
      }, {
        uuid: 124,
        name: 'Lanz',
      }],
      item: {
        inputArray: [{
          uuid: 123,
          name: 'Klaus',
        }, {
          uuid: 125,
          name: 'Heinz',
        }],
      },
      meta: {
        key: 'uuid',
      },
    });

    expect(newReceiveData).toEqual([{
      uuid: 122,
      name: 'Franz',
    }, {
      uuid: 123,
      name: 'Hans',
    }, {
      uuid: 124,
      name: 'Lanz',
    }]);
  });
});
