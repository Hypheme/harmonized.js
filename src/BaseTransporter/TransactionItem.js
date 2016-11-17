// @flow
export default class TransactionItem {
  payload: Object;
  action: string;

  constructor(action: string, payload: Object) {
    this.action = action;
    this.payload = payload;
  }

  get id() {
    return this.payload.id;
  }

  get _id() {
    return this.payload._id;
  }
}
