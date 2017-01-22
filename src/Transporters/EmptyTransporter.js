import uuid from 'uuid/v4';
import { PROMISE_STATE } from '../constants';

export default class EmptyTransporter {
  constructor(keyName) {
    this._keyName = keyName;
    this.update = this._returnInput;
    this.delete = this._returnInput;
    this.fetch = this._returnInput;
    this.fetchAll = this._returnEmptyArray;
  }

  _returnInput(input) {
    return Promise.resolve({
      status: PROMISE_STATE.RESOLVED,
      data: input,
    });
  }

  _returnEmptyArray() {
    return Promise.resolve([]);
  }

  initialFetch(/* baseData*/) {
    return Promise.resolve({
      items: [],
      toDelete: [],
    });
  }

  create(): Promise {
    return Promise.resolve({
      status: PROMISE_STATE.RESOLVED,
      data: {
        [this._keyName]: uuid(),
      },
    });
  }

  onceAvailable(): Promise {
    return Promise.resolve();
  }
}
