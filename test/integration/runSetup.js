import runCases from './runCases';

export default function runSetup(setup) {
  describe(setup.name, function () {
    if (setup.bfe) {
      beforeEach(setup.bfe);
    }

    describe('Transporter ❌ - ClientStorage ❌', function () {
      const connectionState = {
        transporter: false,
        clientStorage: false,
      };

      if (setup.before) {
        beforeAll(setup.before);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ✅ - ClientStorage ❌', function () {
      const connectionState = {
        transporter: true,
        clientStorage: false,
      };

      if (setup.before) {
        beforeAll(setup.before);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ❌ - ClientStorage ✅', function () {
      const connectionState = {
        transporter: false,
        clientStorage: true,
      };

      if (setup.before) {
        beforeAll(setup.before);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ✅ - ClientStorage ✅', function () {
      const connectionState = {
        transporter: true,
        clientStorage: true,
      };

      if (setup.before) {
        beforeAll(setup.before);
      }

      runCases(setup, connectionState);
    });
  });
}
