import runCases from './runCases';

export default function runSetup(setup) {
  describe('Transporter ❌ - ClientStorage ❌', function () {
    const connectionState = {
      transporter: false,
      clientStorage: false,
    };
    runCases(setup, connectionState);
  });

  describe('Transporter ✅ - ClientStorage ❌', function () {
    const connectionState = {
      transporter: false,
      clientStorage: false,
    };
    runCases(setup, connectionState);
  });

  describe('Transporter ❌ - ClientStorage ✅', function () {
    const connectionState = {
      transporter: false,
      clientStorage: false,
    };
    runCases(setup, connectionState);
  });

  describe('Transporter ✅ - ClientStorage ✅', function () {
    const connectionState = {
      transporter: false,
      clientStorage: false,
    };
    runCases(setup, connectionState);
  });
}
