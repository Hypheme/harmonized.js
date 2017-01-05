export default class EmptyTransporter {
  constructor() {
    this.create = this._returnInput;
    this.update = this._returnInput;
    this.delete = this._returnInput;
    this.fetch = this._returnInput;
    this.fetchAll = this._returnEmptyArray;
    this.initialFetch = this._returnEmptyArray;
  }

  _returnInput(input) {
    return Promise.resolve(input);
  }

  _returnEmptyArray() {
    return Promise.resolve([]);
  }

  onceAvailable() {
    return Promise.resolve();
  }
}
