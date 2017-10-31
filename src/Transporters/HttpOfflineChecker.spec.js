import fetchMock from 'fetch-mock';
import HttpOfflineChecker from './HttpOfflineChecker';

describe('HttpOfflineChecker', function () {
  describe('construction', function () {
    it('should be done with a regexp url pattern', function () {
      const urlPattern = /https:\/\/www.hyphe.me\/.*?/;
      const offlineChecker = new HttpOfflineChecker({
        pattern: urlPattern,
        checkUrl: 'https://www.hyphe.me/status',
      });

      expect(offlineChecker.urlPattern).toBe(urlPattern);
      expect(offlineChecker.checkUrl).toBe('https://www.hyphe.me/status');
    });

    it('should be done with a glob url pattern', function () {
      const urlPattern = 'https://www.hyphe.me/*';
      const offlineChecker = new HttpOfflineChecker({
        pattern: urlPattern,
      });

      expect(offlineChecker.urlPattern).not.toBe(urlPattern);
      expect(offlineChecker.urlPattern instanceof RegExp).toBe(true);
    });

    it('should be done without a url pattern', function () {
      const offlineChecker = new HttpOfflineChecker({
      });

      expect(offlineChecker.urlPattern).toBeUndefined();
    });
  });

  describe('methods', function () {
    beforeEach(function () {
      this.offlineChecker = new HttpOfflineChecker({
        pattern: 'https://www.hyphe.me/v1/*/blub/*',
        checkUrl: 'https://www.hyphe.me/status',
      });
    });

    it('should test url pattern', function () {
      expect(this.offlineChecker.test('https://www.hyphe.me/v1/path/blub/123')).toBe(true);
      expect(this.offlineChecker.test('https://www.hyphe.me/v2/path/blub/123')).toBe(false);
    });

    it('should get offline status', function () {
      this.offlineChecker._isOffline = false;
      expect(this.offlineChecker.isOffline).toBe(false);
      this.offlineChecker._isOffline = true;
      expect(this.offlineChecker.isOffline).toBe(true);
    });

    it('should set offline and retry until max pause is reached', function (done) {
      jasmine.clock().install();
      let statusReqCount = 0;

      const originalOnceAvailable = this.offlineChecker._checkOffline;
      spyOn(window, 'clearTimeout').and.callThrough();
      spyOn(this.offlineChecker, '_checkOffline').and.callFake((...args) => {
        originalOnceAvailable.apply(this.offlineChecker, args);
        const prePause = statusReqCount < 11 ? (statusReqCount * 3000) - 1 : 29999;
        jasmine.clock().tick(prePause);
        expect(statusReqCount).toBe(statusReqCount);
        jasmine.clock().tick(1);
      });

      fetchMock.mock('https://www.hyphe.me/status', (url, opts) => {
        statusReqCount += 1;
        expect(opts).toEqual({
          method: 'GET',
          headers: jasmine.any(Headers),
          mode: 'cors',
        });
        expect(this.offlineChecker._resolve instanceof Function).toBe(true);
        expect(this.offlineChecker._reject instanceof Function).toBe(true);
        expect(Number.isInteger(this.offlineChecker._checkTimeout)).toBe(true);
        expect(this.offlineChecker.isOffline).toBe(true);

        switch (statusReqCount) {
          case 1:
          case 2:
          case 3:
          case 4:
          case 5:
          case 6:
          case 7:
          case 8:
          case 9:
          case 10:
          case 11:
            // offline!
            return {
              throws: 'no connection',
            };
          case 12:
            // problem on server
            return {
              status: 500,
            };
          case 13:
            // online!
            return {};
          default:
            throw new Error('this shouldn\'t happen');
        }
      });

      const promise1 = this.offlineChecker.setOffline();
      const promise2 = this.offlineChecker.setOffline();
      expect(promise1).toBe(promise2);
      Promise.all([promise1, promise2]).then(() => {
        expect(this.offlineChecker._resolve).toBeUndefined();
        expect(this.offlineChecker._reject).toBeUndefined();
        expect(clearTimeout).toHaveBeenCalledWith(13);
        expect(clearTimeout).toHaveBeenCalledTimes(1);
        expect(this.offlineChecker._checkTimeout).toBeUndefined();
        expect(this.offlineChecker.isOffline).toBe(false);
        expect(statusReqCount).toBe(13);
        fetchMock.restore();
        jasmine.clock().uninstall();
        done();
      });

      jasmine.clock().tick(0);
    });

    it('should set offline manually when already online', function () {
      this.offlineChecker._isOffline = false;
      this.offlineChecker._promise = 1;
      this.offlineChecker._resolve = 2;
      this.offlineChecker._reject = 3;
      this.offlineChecker._checkTimeout = 4;
      spyOn(window, 'clearTimeout').and.callThrough();

      this.offlineChecker.setOnline();

      expect(clearTimeout).not.toHaveBeenCalled();
      expect(this.offlineChecker._isOffline).toBe(false);
      expect(this.offlineChecker._promise).toBe(1);
      expect(this.offlineChecker._resolve).toBe(2);
      expect(this.offlineChecker._reject).toBe(3);
      expect(this.offlineChecker._checkTimeout).toBe(4);
    });

    it('should set offline manually when offline', function () {
      const resolve = jasmine.createSpy('resolve');
      this.offlineChecker._isOffline = true;
      this.offlineChecker._promise = 1;
      this.offlineChecker._resolve = resolve;
      this.offlineChecker._reject = 3;
      this.offlineChecker._checkTimeout = 4;
      spyOn(window, 'clearTimeout');
      spyOn(window, 'setTimeout');

      this.offlineChecker.setOnline();

      expect(clearTimeout).toHaveBeenCalledTimes(1);
      expect(clearTimeout).toHaveBeenCalledWith(4);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledWith();
      expect(this.offlineChecker._isOffline).toBe(false);
      expect(this.offlineChecker._promise).toBeUndefined();
      expect(this.offlineChecker._resolve).toBeUndefined();
      expect(this.offlineChecker._reject).toBeUndefined();
      expect(this.offlineChecker._checktimeout).toBeUndefined();

      this.offlineChecker._checkOffline();
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should get promise of currently running offline check', function () {
      this.offlineChecker._promise = 'THE promise';
      expect(this.offlineChecker.onceAvailable()).toBe(this.offlineChecker._promise);
    });

    it('should get auto resolving promise when no running offline checks', function (done) {
      this.offlineChecker._promise = undefined;
      this.offlineChecker.onceAvailable().then(() => {
        done();
      });
    });
  });
});
