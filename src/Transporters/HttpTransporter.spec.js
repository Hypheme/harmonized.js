import fetchMock from 'fetch-mock';
import HttpTransporter from './HttpTransporter';

describe('HttpTransporter', function () {
  beforeEach(function () {
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

  describe('prepare requests', function () {
    beforeEach(function () {
      this.httpTransporter = new HttpTransporter({
        baseUrl: 'https://www.hyphe.me',
        path: 'login',
      });

      this.item = {
        payload: {
          id: 123,
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
          id: 123,
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
          id: 123,
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
          id: 123,
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
          id: 123,
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

      httpTransporter._request({
        baseUrl: 'https://www.hyphe.me',
        path: 'users',
        payload: {
          id: 123,
          hello: 'server',
        },
        templatePath: ':basePath/:id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      }).then(({ res, req }) => {
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

        res.json().then(body => {
          expect(body).toEqual({
            hello: 'back',
          });
          done();
        });
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

      httpTransporter._request({
        baseUrl: 'https://www.hyphe.me',
        path: 'users',
        payload: {
          id: 123,
          hello: 'server',
        },
        templatePath: ':basePath/:id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
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

        res.json().then(body => {
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

      expect(httpTransporter.offlineChecker.setOffline).toHaveBeenCalledTimes(0);
      httpTransporter._request({
        baseUrl: 'https://www.hyphe.me',
        path: 'users',
        payload: {
          id: 123,
          hello: 'server',
        },
        templatePath: ':basePath/:id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      }).catch(({ error, req }) => {
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

    httpTransporter.getItemPath({
      id: 123,
    }).then(path => {
      expect(path).toBe('login/somesubpath/123');
      done();
    });
  });

  it('should add a offline checker', function () {
    HttpTransporter.offlineCheckerList = [];
    expect(HttpTransporter.offlineCheckerList).toEqual([]);
    HttpTransporter.addOfflineChecker('checker 1');
    expect(HttpTransporter.offlineCheckerList).toEqual([
      'checker 1',
    ]);
    HttpTransporter.addOfflineChecker('checker 2');
    HttpTransporter.addOfflineChecker('checker 3');
    expect(HttpTransporter.offlineCheckerList).toEqual([
      'checker 1',
      'checker 2',
      'checker 3',
    ]);
  });
});
