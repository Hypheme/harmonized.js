// @flow
import { unionWith } from 'lodash';
import TransporterMiddleware from './TransporterMiddleware';
import TransactionItem from '../TransactionItem';

type ReceiveAttributes = {
  action: string,
  data: Object,
  meta: Object,
  item: TransactionItem,
};

export default class InitialFetchHttpMiddleware extends TransporterMiddleware {
  receive({ action, data, item, meta }: ReceiveAttributes) {
    if (action === 'initialFetch') {
      const key = meta.key;
      return unionWith(
        data,
        item.inputArray,
        (thisVal: Object, otherVal: Object) => thisVal[key] === otherVal[key],
      );
    }

    return data;
  }

}

InitialFetchHttpMiddleware.uniqueName = 'InitialFetchMiddleware';
