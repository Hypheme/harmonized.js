import {Item} from './harmonized';

export default class TestItem extends Item {

  static rawItemKeys = ['title', 'data'];
  get rawItemKeys() {
    return TestItem.rawItemKeys;
  }
}
