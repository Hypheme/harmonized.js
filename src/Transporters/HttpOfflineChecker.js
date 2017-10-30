// @flow
import globToRegExp from 'glob-to-regexp';

type ConstructorOptions = {
  pattern: RegExp | string,
  checkUrl: string;
};

const RETRY_BASE_PAUSE = 3000;
const RETRY_MAX_PAUSE = 30000;

export default class HttpOfflineChecker {
  urlPattern: RegExp;
  checkUrl: string;
  _isOffline: boolean;
  _promise: ?Promise<*>;
  _checkTimeout: number | void;
  _resolve: ?Function;
  _reject: ?Function;

  constructor({
    pattern,
    checkUrl,
  }: ConstructorOptions) {
    this._isOffline = false;
    this.checkUrl = checkUrl;
    if (pattern instanceof RegExp) {
      this.urlPattern = pattern;
    } else if (typeof pattern === 'string') {
      this.urlPattern = globToRegExp(pattern);
    }
  }

  test(url: string): boolean {
    return this.urlPattern.test(url);
  }

  get isOffline(): boolean {
    return this._isOffline;
  }

  setOffline(): Promise<*> {
    this._isOffline = true;
    this._promise = this._promise || new Promise(this._checkOffline.bind(this));
    return this._promise;
  }

  setOnline(): void {
    if (!this._isOffline) return;

    if (this._resolve) this._resolve();
    this._isOffline = false;
    this._promise = undefined;
    this._resolve = undefined;
    this._reject = undefined;
    clearTimeout(this._checkTimeout);
    this._checkTimeout = undefined;
  }

  _checkOffline(resolve: Function, reject: Function, retryCount: number = 0) {
    if (!this._isOffline) return;

    const pause = Math.min(retryCount * RETRY_BASE_PAUSE, RETRY_MAX_PAUSE);
    this._resolve = resolve;
    this._reject = reject;
    this._checkTimeout = setTimeout(() => {
      const req = {
        method: 'GET',
        headers: new Headers({}),
        mode: 'cors',
      };

      fetch(this.checkUrl, req).then((res) => {
        if (res.ok) {
          this.setOnline();
        } else {
          this._checkOffline(resolve, reject, retryCount + 1);
        }
      }, () => {
        this._checkOffline(resolve, reject, retryCount + 1);
      });
    }, pause);
  }

  onceAvailable(): Promise<*> {
    return this._promise || Promise.resolve();
  }
}
