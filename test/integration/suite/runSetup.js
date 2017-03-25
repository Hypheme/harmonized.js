import runCases from './runCases';

export default function runSetup(setup) {
  describe(setup.name, function () {
    if (setup.beforeEach) {
      beforeEach(setup.beforeEach);
    }

    describe('Transporter ❌ - ClientStorage ❌', function () {
      const connectionState = {
        transporter: false,
        clientStorage: false,
      };

      if (setup.beforeAll) {
        beforeAll(setup.beforeAll);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ✅ - ClientStorage ❌', function () {
      const connectionState = {
        transporter: true,
        clientStorage: false,
      };

      if (setup.beforeAll) {
        beforeAll(setup.beforeAll);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ❌ - ClientStorage ✅', function () {
      const connectionState = {
        transporter: false,
        clientStorage: true,
      };

      if (setup.beforeAll) {
        beforeAll(setup.beforeAll);
      }

      runCases(setup, connectionState);
    });

    describe('Transporter ✅ - ClientStorage ✅', function () {
      const connectionState = {
        transporter: true,
        clientStorage: true,
      };

      if (setup.beforeAll) {
        beforeAll(setup.beforeAll);
      }

      runCases(setup, connectionState);
    });
  });
}
