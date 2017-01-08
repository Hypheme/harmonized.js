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

    xit('should set offline and retry until max pause is reached', function () {
      jasmine.clock().install();
      jasmine.clock().uninstall();
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
