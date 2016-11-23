import Transporter from './Transporter';
import { TransactionItem } from '../BaseTransporter';

export default class HttpTransporter extends Transporter {
  _getMethodMap(action) {
    return this.methodMap.get(action) || HttpTransporter.methodMap.get(action);
  }

  _prepareHttpRequest({ action, payload }) {
    return {
      action,
      req: {
        method: this._getMethodMap(action),
        mode: 'cors',
        body: payload,
      },
    };
  }

  _prepareRequest(item: TransactionItem) {
    switch (item.action) {
      case 'create':
      case 'update':
      case 'delete':
      case 'fetch':
      case 'fetchAll':
      case 'initialFetch':
        return this._prepareHttpRequest(item);
        break;
      default:
        throw new Error('Transaction item has unknown action!');
        break;
    }
  }

  _request({ action, url, req }) {
    return fetch(url).then((res) => {
      return { res, req };
    }, (error) => {
      return { error, req };
    });
  }

  static methodMap = new Map();
}

HttpTransporter.methodMap.set('create', {
  method: 'POST',
  urlTemplate: ':resourceName',
});

HttpTransporter.methodMap.set('update', {
  method: 'PUT',
  urlTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('delete', {
  method: 'DELETE',
  urlTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('fetch', {
  method: 'GET',
  urlTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('fetchAll', {
  method: 'GET',
  urlTemplate: ':resourceName',
});

HttpTransporter.methodMap.set('initialFetch', {
  method: 'GET',
  urlTemplate: ':resourceName',
});
