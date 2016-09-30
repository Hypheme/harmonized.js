import TransporterMiddleware from './TransporterMiddleware';

class ExtendedTransporterMiddleware extends TransporterMiddleware {
  constructor(someArgument) {
    super();
    this.someProperty = someArgument;
    this.addItemToQueue = 'addItemToQueue';
    this.updateQueueAfterReceive = 'updateQueueAfterReceive';
    this.send = 'send';
    this.receive = 'receive';
    this.sendError = 'sendError';
    this.receiveError = 'receiveError';
  }
}

fdescribe('Transporter Middleware', function () {
  it('should have static method', function () {
    const expectedMethods = [
      'addItemToQueue',
      'updateQueueAfterReceive',
      'send',
      'receive',
      'sendError',
      'receiveError',
    ];

    expect(TransporterMiddleware.methods).toEqual(expectedMethods);
    expect(ExtendedTransporterMiddleware.methods).toEqual(expectedMethods);
  });

  it('should build unfiltered extended TransporterMiddleware', function () {
    const extendedTransporterMiddleware = ExtendedTransporterMiddleware.build(['hi']);
    expect(extendedTransporterMiddleware.someProperty).toBe('hi');
    expect(extendedTransporterMiddleware.addItemToQueue).toBe('addItemToQueue');
    expect(extendedTransporterMiddleware.updateQueueAfterReceive).toBe('updateQueueAfterReceive');
    expect(extendedTransporterMiddleware.send).toBe('send');
    expect(extendedTransporterMiddleware.receive).toBe('receive');
    expect(extendedTransporterMiddleware.sendError).toBe('sendError');
    expect(extendedTransporterMiddleware.receiveError).toBe('receiveError');
  });

  it('should build filtered extended TransporterMiddleware', function () {
    const extendedTransporterMiddleware = ExtendedTransporterMiddleware.build(['hi'],
      'send', 'sendError');
    expect(extendedTransporterMiddleware.someProperty).toBe('hi');
    expect(extendedTransporterMiddleware.addItemToQueue).toBeUndefined();
    expect(extendedTransporterMiddleware.updateQueueAfterReceive).toBeUndefined();
    expect(extendedTransporterMiddleware.send).toBe('send');
    expect(extendedTransporterMiddleware.receive).toBeUndefined();
    expect(extendedTransporterMiddleware.sendError).toBe('sendError');
    expect(extendedTransporterMiddleware.receiveError).toBeUndefined();
  });
});
