const testsContext = require.context('../../src', false, /\.spec$/);
console.log('whoop', testsContext);
testsContext.keys().forEach(testsContext);
