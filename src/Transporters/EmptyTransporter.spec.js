import EmptyTransporter from './EmptyTransporter';
import { PROMISE_STATE } from '../constants';

describe('EmptyTransporter', function () {
  beforeEach(function () {
    this.emptyTransporter = new EmptyTransporter();

    this.doFakeRequest = (action, done) => {
      const inputData = {
        input: 'data',
      };
      this.emptyTransporter[action](inputData).then((outputData) => {
        expect(outputData.status).toBe(PROMISE_STATE.RESOLVED);
        expect(outputData.data).toBe(inputData);
        done();
      });
    };
  });

  it('should do fake "create" request', function (done) {
    const inputData = {
      input: 'data',
    };

    const emptyTransporter = new EmptyTransporter('____id');

    emptyTransporter.create(inputData).then((outputData) => {
      expect(outputData).toEqual({
        status: PROMISE_STATE.RESOLVED,
        data: {
          ____id: jasmine.any(String),
        },
      });
      done();
    });
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
    this.emptyTransporter.initialFetch([{ some: 'input' }]).then((outputData) => {
      expect(outputData).toEqual({
        items: [],
        toDelete: [],
      });
      done();
    });
  });

  it('should get onceAvailable', function (done) {
    this.emptyTransporter.onceAvailable().then(() => {
      done();
    });
  });
});
