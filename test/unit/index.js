const testsContext = require.context('./', false, /\.spec$/);
testsContext.keys().forEach(testsContext);
