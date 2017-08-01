import fetchMock from 'fetch-mock';
import HttpTransporter from './HttpTransporter';
import { STATE, PROMISE_STATE } from '../constants';

describe('HttpTransporter', function () {
  beforeEach(function () {
    this.HttpOfflineCheckerMock = jasmine.createSpy('offline checker').and.callFake(function () {
      this.test = jasmine.createSpy('offline checker test');
    });

    // HttpTransporter.__Rewire__('HttpOfflineChecker', this.HttpOfflineCheckerMock);
    HttpTransporter.HttpOfflineChecker = this.HttpOfflineCheckerMock;

    HttpTransporter.offlineCheckerList = [
      { name: 'third', test: () => true },
    ];
  });
  it('should be constructed', function () {
    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });

    expect(httpTransporter.baseUrl).toBe('https://www.hyphe.me');
    expect(httpTransporter.path).toBe('login');
    expect(httpTransporter.methodMap instanceof Map).toBe(true);
    expect(httpTransporter.methodMap.size).toBe(0);
  });

  it('should be constructed with multiple matching offline checkers and use first', function () {
    HttpTransporter.offlineCheckerList = [
      { name: 'first', test: () => false },
      { name: 'second', test: () => false },
      { name: 'third', test: () => true },
      { name: 'fourth', test: () => true },
    ];

    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });
    expect(httpTransporter.offlineChecker.name).toBe('third');
  });

  it('should be constructed with one matching offline checkers and use first', function () {
    HttpTransporter.offlineCheckerList = [
      { name: 'first', test: () => false },
      { name: 'second', test: () => false },
      { name: 'third', test: () => false },
      { name: 'fourth', test: () => true },
    ];

    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });
    expect(httpTransporter.offlineChecker.name).toBe('fourth');
  });

  it('should be constructed with no matching offline checkers and throw error', function () {
    HttpTransporter.offlineCheckerList = [
      { name: 'first', test: () => false },
      { name: 'second', test: () => false },
      { name: 'third', test: () => false },
      { name: 'fourth', test: () => false },
    ];

    expect(() => new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    })).toThrowError('missing offline checker');
  });

  it('should use the default initialFetchStrategy', function (done) {
    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });

    httpTransporter._role = {
      AS_TARGET: 'as target',
    };

    httpTransporter._store = {
      schema: {
        getKeyIdentifierFor: jasmine.createSpy('getKeyIdentifierFor').and.returnValue('superid'),
      },
    };

    httpTransporter.fetch = jasmine.createSpy('fetch').and.returnValue(Promise.resolve({
      status: 'superstatus',
      data: [
        { superid: 123 },
        { superid: 126 },
      ],
    }));

    httpTransporter.initialFetchStrategy([
      {
        superid: 123,
        _transporterState: STATE.BEING_CREATED,
      },
      {
        superid: 124,
        _transporterState: STATE.EXISTENT,
      },
      {
        _transporterState: STATE.BEING_CREATED,
      },
      {
        superid: 125,
        _transporterState: STATE.BEING_DELETED,
      },
      {
        superid: 126,
        _transporterState: STATE.EXISTENT,
      },
    ]).then((items) => {
      expect(items).toEqual({
        status: 'superstatus',
        data: {
          items: [
            { superid: 123 },
            { superid: 126 },
          ],
          toDelete: [
            {
              superid: 124,
              _transporterState: STATE.EXISTENT,
            },
          ],
        },
      });
      done();
    });
  });

  describe('prepare requests', function () {
    beforeEach(function () {
      this.httpTransporter = new HttpTransporter({
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
      });

      this.item = {
        payload: {
          superid: 123,
          some: 'value',
        },
      };
    });

    it('should prepare "create" request', function () {
      this.item.action = 'create';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'create',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath',
        payload: {
          superid: 123,
          some: 'value',
        },
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should prepare "update" request', function () {
      this.item.action = 'update';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'update',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath/:id',
        payload: {
          superid: 123,
          some: 'value',
        },
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should prepare "delete" request', function () {
      this.item.action = 'delete';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'delete',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath/:id',
        payload: {
          superid: 123,
          some: 'value',
        },
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should prepare "fetch" request', function () {
      this.item.action = 'fetch';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'fetch',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath/:id',
        payload: {
          superid: 123,
          some: 'value',
        },
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should prepare "fetchAll" request', function () {
      this.item.action = 'fetchAll';
      delete this.item.payload;
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'fetchAll',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath',
        payload: undefined,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should prepare "initialFetch" request', function () {
      this.item.action = 'initialFetch';
      delete this.item.payload;
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest).toEqual({
        action: 'initialFetch',
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
        pathTemplate: ':basePath',
        payload: undefined,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });
    });

    it('should throw error when trying to prepare request with unknown action', function () {
      this.item.action = 'superFetch';
      expect(() => {
        this.httpTransporter._prepareRequest(this.item);
      }).toThrow(new Error('Transaction item has unknown action!'));
    });

    xit('should prepare request with full path', function () {
      this.item.action = 'fetch';
      this.httpTransporter.fullPath = 'complete/new/path';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest.path).toBe('complete/new/path');
    });

    it('should prepare request with option path', function () {
      this.item.action = 'fetch';
      this.httpTransporter.fullPath = undefined;
      this.httpTransporter.path = 'some/path';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest.path).toBe('some/path');
    });

    it('should prepare request with instance base URL', function () {
      this.item.action = 'fetch';
      HttpTransporter.baseUrl = 'https://not.hyphe.me';
      this.httpTransporter.baseUrl = 'https://www.hyphe.me';
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest.baseUrl).toBe('https://www.hyphe.me');
    });

    xit('should prepare request with class base URL', function () {
      this.item.action = 'fetch';
      HttpTransporter.baseUrl = 'https://not.hyphe.me';
      this.httpTransporter.baseUrl = undefined;
      const preparedRequest = this.httpTransporter._prepareRequest(this.item);
      expect(preparedRequest.baseUrl).toBe('https://not.hyphe.me');
    });

    it('should get method from action mixed with instance and class methodMap', function () {
      this.httpTransporter.methodMap.set('update', {
        method: 'PATCH',
        pathTemplate: ':basePath/subpath/:id',
      });

      expect(this.httpTransporter.methodMap.size).toBe(1);

      expect(this.httpTransporter._getMethodFromAction('update')).toEqual({
        method: 'PATCH',
        pathTemplate: ':basePath/subpath/:id',
      });

      expect(this.httpTransporter._getMethodFromAction('fetch')).toEqual({
        method: 'GET',
        pathTemplate: ':basePath/:id',
      });
    });
  });

  describe('server request', function () {
    afterEach(function () {
      fetchMock.restore();
    });

    it('should do request', function (done) {
      fetchMock.mock('https://www.hyphe.me/users/123', (url, opts) => {
        expect(opts).toEqual({
          method: 'POST',
          headers: jasmine.any(Headers),
          mode: 'cors',
          body: JSON.stringify({
            id: 123,
            hello: 'server',
          }),
        });

        expect(opts.headers.getAll('Content-Type')[0]).toBe('application/json');

        return {
          hello: 'back',
        };
      });

      const httpTransporter = new HttpTransporter({
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
      });

      httpTransporter._role = { AS_TARGET: 'as target' };
      httpTransporter._store = {
        schema: {
          getKeyIdentifierFor: jasmine.createSpy('getKeyIdentifierFor').and.returnValue('id'),
        },
      };

      httpTransporter._request({
        req: {
          baseUrl: 'https://www.hyphe.me',
          path: 'users',
          payload: {
            id: 123,
            hello: 'server',
          },
          pathTemplate: ':basePath/:id',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
        },
      }).then(({ res, req, data, status }) => {
        expect(data).toEqual({
          hello: 'back',
        });
        expect(status).toBe(PROMISE_STATE.RESOLVED);
        expect(req).toEqual({
          method: 'POST',
          body: JSON.stringify({
            id: 123,
            hello: 'server',
          }),
          mode: 'cors',
          headers: jasmine.any(Headers),
        });
        expect(res.ok).toBe(true);

        done();
      });
    });

    it('should do request with server error', function (done) {
      fetchMock.mock('https://www.hyphe.me/users/123', {
        status: 500,
        body: {
          error: 'message',
        },
      });

      const httpTransporter = new HttpTransporter({
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
      });

      httpTransporter._role = { AS_TARGET: 'as target' };
      httpTransporter._store = {
        schema: {
          getKeyIdentifierFor: jasmine.createSpy('getKeyIdentifierFor').and.returnValue('id'),
        },
      };

      httpTransporter._request({
        req: {
          baseUrl: 'https://www.hyphe.me',
          path: 'users',
          payload: {
            id: 123,
            hello: 'server',
          },
          pathTemplate: ':basePath/:id',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
        },
      }).catch(({ res, req }) => {
        expect(res.status).toBe(500);
        expect(req).toEqual({
          method: 'POST',
          body: JSON.stringify({
            id: 123,
            hello: 'server',
          }),
          mode: 'cors',
          headers: jasmine.any(Headers),
        });

        res.json().then((body) => {
          expect(body).toEqual({
            error: 'message',
          });
          done();
        });
      });
    });

    it('should do request with timeout', function (done) {
      fetchMock.mock('https://www.hyphe.me/users/123', {
        throws: {
          status: 0,
          message: 'timeout!',
        },
      });

      const httpTransporter = new HttpTransporter({
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
      });
      httpTransporter.offlineChecker = {
        setOffline: jasmine.createSpy('set offline'),
      };

      httpTransporter._role = { AS_TARGET: 'as target' };
      httpTransporter._store = {
        schema: {
          getKeyIdentifierFor: jasmine.createSpy('getKeyIdentifierFor').and.returnValue('id'),
        },
      };

      expect(httpTransporter.offlineChecker.setOffline).toHaveBeenCalledTimes(0);
      httpTransporter._request({
        req: {
          baseUrl: 'https://www.hyphe.me',
          path: 'users',
          payload: {
            id: 123,
            hello: 'server',
          },
          pathTemplate: ':basePath/:id',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
        },
      }).then(({ error, req, data, status }) => {
        expect(data).toEqual({});
        expect(status).toBe(PROMISE_STATE.PENDING);
        expect(error).toEqual({
          status: 0,
          message: 'timeout!',
        });

        expect(req).toEqual({
          method: 'POST',
          body: JSON.stringify({
            id: 123,
            hello: 'server',
          }),
          mode: 'cors',
          headers: jasmine.any(Headers),
        });
        expect(httpTransporter.offlineChecker.setOffline).toHaveBeenCalledTimes(1);

        done();
      });
    });
  });

  it('should get path of item', function (done) {
    // This should manipulate the item path
    HttpTransporter.add({
      send: (item) => {
        item.pathTemplate = item.pathTemplate.replace('/', '/somesubpath/');
        return item;
      },
    });

    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });

    httpTransporter._role = { AS_TARGET: 'as target' };
    httpTransporter._store = {
      schema: {
        getKeyIdentifierFor: jasmine.createSpy('getKeyIdentifierFor').and.returnValue('id'),
      },
    };

    httpTransporter.getItemPath({
      id: 123,
    }).then((path) => {
      expect(path).toBe('login/somesubpath/123');
      done();
    });
  });

  it('should add a offline checker as HttpOfflineChecker', function () {
    HttpTransporter.offlineCheckerList = [];
    expect(HttpTransporter.offlineCheckerList).toEqual([]);
    const offlineChecker1 = new this.HttpOfflineCheckerMock();
    const offlineChecker2 = new this.HttpOfflineCheckerMock();
    const offlineChecker3 = new this.HttpOfflineCheckerMock();
    HttpTransporter.addOfflineChecker(offlineChecker1);
    expect(HttpTransporter.offlineCheckerList).toEqual([
      offlineChecker1,
    ]);
    HttpTransporter.addOfflineChecker(offlineChecker2);
    HttpTransporter.addOfflineChecker(offlineChecker3);
    expect(HttpTransporter.offlineCheckerList).toEqual([
      offlineChecker1,
      offlineChecker2,
      offlineChecker3,
    ]);
  });

  it('should add a offline checker as Object', function () {
    HttpTransporter.offlineCheckerList = [];
    expect(HttpTransporter.offlineCheckerList).toEqual([]);
    const offlineCheckerOptions1 = { name: 'o1' };
    const offlineCheckerOptions2 = { name: 'o2' };
    const offlineCheckerOptions3 = { name: 'o3' };
    HttpTransporter.addOfflineChecker(offlineCheckerOptions1);
    expect(this.HttpOfflineCheckerMock).toHaveBeenCalledTimes(1);
    expect(this.HttpOfflineCheckerMock).toHaveBeenCalledWith(offlineCheckerOptions1);
    expect(HttpTransporter.offlineCheckerList).toEqual([
      jasmine.any(this.HttpOfflineCheckerMock),
    ]);

    HttpTransporter.addOfflineChecker(offlineCheckerOptions2);
    HttpTransporter.addOfflineChecker(offlineCheckerOptions3);
    expect(this.HttpOfflineCheckerMock).toHaveBeenCalledTimes(3);
    expect(this.HttpOfflineCheckerMock).toHaveBeenCalledWith(offlineCheckerOptions2);
    expect(this.HttpOfflineCheckerMock).toHaveBeenCalledWith(offlineCheckerOptions3);
    expect(HttpTransporter.offlineCheckerList).toEqual([
      jasmine.any(this.HttpOfflineCheckerMock),
      jasmine.any(this.HttpOfflineCheckerMock),
      jasmine.any(this.HttpOfflineCheckerMock),
    ]);
    HttpTransporter.offlineCheckerList = [];
  });

  it('should get onceAvailable', function () {
    const httpTransporter = new HttpTransporter({
      baseUrl: 'https://www.hyphe.me',
      path: 'login',
    });
    httpTransporter.offlineChecker = {
      onceAvailable: jasmine.createSpy('once available').and.returnValue('1'),
    };

    expect(httpTransporter.onceAvailable()).toBe('1');
    expect(httpTransporter.offlineChecker.onceAvailable).toHaveBeenCalledTimes(1);
  });
});
