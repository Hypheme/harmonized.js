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
    let constructedPath = pathTemplate.replace(/:basePath(\/|$)/, path);
    constructedPath = constructedPath.replace(/:id(\/|$)/, payload.id);
    return constructedPath;
  }

  getPathForItem(payload: Object) {
    const action = 'fetch';
    const preparedReq = this._prepareHttpRequest({ action, payload });

    // run send middleware then send and afterwards work off the queue
    return this.constructor.runMiddleware('send', { action, req: preparedReq })
      .then(({ path, templatePath, req }) => this.createPath(path, templatePath, req.body));
  }

  _getMethodFromAction(action: string): Object {
    return this.methodMap.get(action) || HttpTransporter.methodMap.get(action) || {};
  }

  _prepareHttpRequest({ action, payload }: { action: string, payload: Object }) {
    const methodOptions: Object = this._getMethodFromAction(action);
    return {
      action,
      baseUrl: (this._baseUrl || this.constructor._baseUrl),
      path: (this.fullPath || this.path),
      pathTemplate: methodOptions.pathTemplate,
      req: {
        method: methodOptions.method,
        headers: {
          'Content-Type': 'application/json',
        },
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

  _request({ baseUrl, path, templatePath, req }:
    { baseUrl: string, path: string, templatePath: string, req: Object }) {
    req.headers = new Headers(req.headers);
    const url: string = `${baseUrl}/${this.createPath(path, templatePath, req.body)}`;
    req.body = JSON.stringify(req.body);
    return fetch(url, req).then((res) => ({ res, req }), (error) => ({ error, req }));
  }

  static methodMap = new Map();

  static setBaseUrl(url: string) {
    this._baseUrl = url;
  }
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
