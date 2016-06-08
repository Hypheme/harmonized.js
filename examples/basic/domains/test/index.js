export default from './Test.View';




static itemKeys = ['userId',
  { key: 'informationKind', store: 'informationKinds', relationKey: 'informationKindId' },
];


cont object = {
  userId: 1,
}
console.log(object['userId']);

// toRawItem
{
  id: 123,
  synced: true,
  stored: false,
  userId: 1,
  informationKind: {
    id: 345,
    synced: true,
    stored: false,
  },
}
// to LocalStorage
{
  id: 123,
  _id: 123,
  _syncState: 2,
  userId: 1,
  informationKindId: 123 || undefined,
  _informationKindId: 123,
}
// to transporter
{
  id: 123,
  userId: 1,
  informationKindId: 123,
}
