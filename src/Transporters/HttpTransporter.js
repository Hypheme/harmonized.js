// @flow
import Transporter from './Transporter';
import { TransactionItem } from '../BaseTransporter';

export default class HttpTransporter extends Transporter {
  baseUrl: string;
  path: string;
  methodMap: Map;
  fullPath: string;

  constructor(options: Object) {
    super();
    this.baseUrl = options.baseUrl;
    this.path = options.path;
    this.methodMap = new Map();
  }

  _getMethodFromAction(action: string) {
    return this.methodMap.get(action) || HttpTransporter.methodMap.get(action);
  }

  _prepareHttpRequest({ action, payload }: { action: string, payload: Object }) {
    return {
      action,
      baseUrl: (this._baseUrl || this.constructor._baseUrl),
      path: (this.createPath(this.fullPath) || this.createPath()),
      req: {
        method: this._getMethodFromAction(action),
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
      default:
        throw new Error('Transaction item has unknown action!');
    }
  }

  _request({ baseUrl, path, req }: { baseUrl: string, path: string, req: Object }) {
    return fetch(`${baseUrl}/${path}`).then((res) => ({ res, req }),
      (error) => ({ error, req }));
  }

  static methodMap = new Map();

  static setBaseUrl(url: string) {
    this._baseUrl = url;
  }
}

HttpTransporter.methodMap.set('create', {
  method: 'POST',
  pathTemplate: ':resourceName',
});

HttpTransporter.methodMap.set('update', {
  method: 'PUT',
  pathTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('delete', {
  method: 'DELETE',
  pathTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('fetch', {
  method: 'GET',
  pathTemplate: ':resourceName/:id',
});

HttpTransporter.methodMap.set('fetchAll', {
  method: 'GET',
  pathTemplate: ':resourceName',
});

HttpTransporter.methodMap.set('initialFetch', {
  method: 'GET',
  pathTemplate: ':resourceName',
});


[
  {
    id: 123,
    authors: [
      {
        id: 312,
        name: 'hans',
      },
    ],
  },
];
