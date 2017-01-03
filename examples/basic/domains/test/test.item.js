import { Item } from './harmonized';


const keys = ['title',
  { key: 'contact', store: 'contacts', relationKey: 'contactId', storeKey: 'id', foreignKey: 'id' },
  { key: 'information', store: 'information', relationKey: 'informationId', storeKey: 'informationId' },
];

const primary = ['contact', 'information'];


console.log(keys, primary);
