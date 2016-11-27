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
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.path = options.path;
    this.methodMap = new Map();
  }

  createPath(path: string, pathTemplate: string, payload: Object) {
    let constructedPath = pathTemplate.replace(':basePath', path);
    constructedPath = constructedPath.replace(':id', payload.id);
    return constructedPath;
  }

  getItemPath(payload: Object) {
    const action = 'fetch';
    const preparedReq = this._prepareHttpRequest({ action, payload });

    // run send middleware then send and afterwards work off the queue
    return this.constructor.runMiddleware('send', preparedReq)
      .then(({ path, pathTemplate, payload }) => this.createPath(path, pathTemplate, payload));
  }

  _getMethodFromAction(action: string): Object {
    return this.methodMap.get(action) || HttpTransporter.methodMap.get(action) || {};
  }

  _prepareHttpRequest({ action, payload }: { action: string, payload: Object }) {
    const methodOptions: Object = this._getMethodFromAction(action);
    return {
      action,
      payload,
      baseUrl: (this.baseUrl || this.constructor.baseUrl),
      path: (this.fullPath || this.path),
      pathTemplate: methodOptions.pathTemplate,
      method: methodOptions.method,
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
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

  _request({ baseUrl, path, payload, templatePath, method, headers, mode }:
    { baseUrl: string,
      path: string,
      payload: Object,
      templatePath: string,
      method: string,
      headers: Object,
      mode: string }) {
    const url: string = `${baseUrl}/${this.createPath(path, templatePath, payload)}`;

    // Build request
    const req = {};
    req.method = method;
    req.headers = new Headers(headers);
    req.mode = mode;

    if (method !== 'GET') {
      req.body = JSON.stringify(payload);
    }

    return fetch(url, req).then((res) => {
      if (res.ok) {
        return { res, req };
      } else {
        return Promise.reject({ res, req });
      }
    }, (error) => {
      return Promise.reject({ error, req });
    });
  }

  static methodMap = new Map();
}

HttpTransporter.methodMap.set('create', {
  method: 'POST',
  pathTemplate: ':basePath',
});

HttpTransporter.methodMap.set('update', {
  method: 'PUT',
  pathTemplate: ':basePath/:id',
});

HttpTransporter.methodMap.set('delete', {
  method: 'DELETE',
  pathTemplate: ':basePath/:id',
});

HttpTransporter.methodMap.set('fetch', {
  method: 'GET',
  pathTemplate: ':basePath/:id',
});

HttpTransporter.methodMap.set('fetchAll', {
  method: 'GET',
  pathTemplate: ':basePath',
});

HttpTransporter.methodMap.set('initialFetch', {
  method: 'GET',
  pathTemplate: ':basePath',
});
