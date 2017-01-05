// @flow
import globToRegExp from 'glob-to-regexp';

type ConstructorOptions = {
  pattern: RegExp,
};

const RETRY_BASE_PAUSE = 3000;
const RETRY_MAX_PAUSE = 30000;

export default class HttpOfflineChecker {
  urlPattern: RegExp;
  checkUrl: string;
  _isOffline: boolean;
  _promise: ?Promise;

  constructor({
    pattern,
  }: ConstructorOptions) {
    this.isOffline = false;
    if (pattern instanceof RegExp) {
      this.urlPattern = pattern;
    } else {
      this.urlPattern = globToRegExp(pattern);
    }
  }

  test(url: string): boolean {
    return this.urlPattern.test(url);
  }

  get isOffline() {
    return this._isOffline;
  }

  setOffline(): void {
    this._isOffline = true;
    this._promise = this.checkOffline();
  }

  setOnline(): void {
    this._isOffline = false;
    this._promise = undefined;
  }

  checkOffline() {
    this._promise = new Promise(this._checkOffline.bind(this));
    return this._promise;
  }

  _checkOffline(resolve: Function, reject: Function, retryCount: number = 0) {
    const pause = Math.min(retryCount * 2 * RETRY_BASE_PAUSE, RETRY_MAX_PAUSE);
    setTimeout(() => {
      fetch(this.checkUrl).then(() => {
        this.setOnline();
        resolve();
      }, () => {
        this._checkOffline(resolve, reject, retryCount + 1);
      });
    }, pause);
  }

  onceAvailabe(): Promise {
    return this._promise || Promise.resolve();
  }
}
