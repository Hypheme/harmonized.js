import { Item } from './harmonized';

export default class TestItem extends Item {

  static keys = Item.autocompleteKeys(['title', 'data']);
  get keys() {
    return TestItem.rawItemKeys;
  }
  primary = 'id'; // default
}


const keys = ['title',
  { key: 'contact', store: 'contacts', relationKey: 'contactId', storeKey: 'id', foreignKey: 'id' },
  { key: 'information', store: 'information', relationKey: 'informationId', storeKey: 'informationId' },
];

const primary = ['contact', 'information'];


console.log(keys, primary);
