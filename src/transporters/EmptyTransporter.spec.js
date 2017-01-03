import EmptyTransporter from './EmptyTransporter';

describe('EmptyTransporter', function () {
  beforeEach(function () {
    this.emptyTransporter = new EmptyTransporter();

    this.doFakeRequest = (action, done) => {
      const inputData = {
        input: 'data',
      };
      this.emptyTransporter[action](inputData).then((outputData) => {
        expect(outputData).toBe(inputData);
        done();
      });
    };
  });

  it('should do fake "create" request', function (done) {
    this.doFakeRequest('create', done);
  });

  it('should do fake "update" request', function (done) {
    this.doFakeRequest('update', done);
  });

  it('should do fake "delete" request', function (done) {
    this.doFakeRequest('delete', done);
  });

  it('should do fake "fetch" request', function (done) {
    this.doFakeRequest('fetch', done);
  });

  it('should do fake "fetchAll" request', function (done) {
    this.emptyTransporter.fetchAll().then((outputData) => {
      expect(outputData).toEqual([]);
      done();
    });
  });

  it('should do fake "initialFetch" request', function (done) {
    this.emptyTransporter.initialFetch().then((outputData) => {
      expect(outputData).toEqual([]);
      done();
    });
  });
});
