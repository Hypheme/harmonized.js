(Function.prototype.bind);
require('babel-polyfill');

const testsContext = require.context('../../src/BaseTransporter', true, /\.spec$/);
testsContext.keys().forEach(testsContext);
