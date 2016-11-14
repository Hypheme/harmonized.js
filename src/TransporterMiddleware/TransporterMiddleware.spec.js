import TransporterMiddleware from './TransporterMiddleware';

class ExtendedTransporterMiddleware extends TransporterMiddleware {
  constructor(someArgument) {
    super();
    this.someProperty = someArgument;
    this.addItemToQueue = 'addItemToQueue';
    this.send = 'send';
    this.receive = 'receive';
    this.transmissionError = 'transmissionError';
  }
}

ExtendedTransporterMiddleware.uniqueName = 'SuperCoolName';

describe('Transporter Middleware', function () {
  it('should have static method', function () {
    const expectedMethods = [
      'addItemToQueue',
      'send',
      'receive',
      'transmissionError',
    ];

    expect(TransporterMiddleware.methods).toEqual(expectedMethods);
    expect(ExtendedTransporterMiddleware.methods).toEqual(expectedMethods);
  });

  it('should build unfiltered extended TransporterMiddleware', function () {
    const extendedTransporterMiddleware = ExtendedTransporterMiddleware.build(['hi']);
    expect(extendedTransporterMiddleware.someProperty).toBe('hi');
    expect(extendedTransporterMiddleware.addItemToQueue).toBe('addItemToQueue');
    expect(extendedTransporterMiddleware.send).toBe('send');
    expect(extendedTransporterMiddleware.receive).toBe('receive');
    expect(extendedTransporterMiddleware.transmissionError).toBe('transmissionError');
  });

  it('should build filtered extended TransporterMiddleware', function () {
    const extendedTransporterMiddleware = ExtendedTransporterMiddleware.build(['hi'],
      'send', 'transmissionError');
    expect(extendedTransporterMiddleware.someProperty).toBe('hi');
    expect(extendedTransporterMiddleware.addItemToQueue).toBeUndefined();
    expect(extendedTransporterMiddleware.send).toBe('send');
    expect(extendedTransporterMiddleware.receive).toBeUndefined();
    expect(extendedTransporterMiddleware.transmissionError).toBe('transmissionError');
  });

  it('should get name', function () {
    expect(new ExtendedTransporterMiddleware().name).toBe('SuperCoolName');
  });
});
