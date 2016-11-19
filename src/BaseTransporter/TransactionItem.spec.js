import TransactionItem from './TransactionItem';

describe('TransactionItem', function () {
  beforeEach(function () {

  });

  it('should create a new push queue item', function () {
    const transactionItem = new TransactionItem('create', {
      id: 123,
      _id: 1,
      pay: 'load',
    });
    expect(transactionItem.action).toBe('create');
    expect(transactionItem.id).toBe(123);
    expect(transactionItem._id).toBe(1);
    expect(transactionItem.payload).toEqual({
      id: 123,
      _id: 1,
      pay: 'load',
    });
  });
});
