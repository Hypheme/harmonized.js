// Karma configuration
// Generated on Fri May 27 2016 18:39:38 GMT+0200 (CEST)
const webpackConf = require('./test/unit/webpack.config');
const webpackConfTravis = require('./test/unit/webpack.travis.config');

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],


    // list of files / patterns to load in the browser
    files: [
      'node_modules/jasmine-promises/dist/jasmine-promises.js',
      'test/unit/index.js',
    ],


    // list of files to exclude
    exclude: [
      'test/unit/helpers/*',
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'test/unit/index.js': ['webpack', 'sourcemap'],
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values:
    // config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN ||
    // config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,

    // Hide webpack build information from output
    webpackMiddleware: {
      noInfo: 'errors-only',
    },
  });

  if (process.env.TRAVIS) {
    config.customLaunchers = {
      Chrome_no_sandbox: {
        base: 'Chrome',
        flags: ['--no-sandbox'],
      },
    };

    config.browsers = ['Chrome_no_sandbox'];

    config.webpack = webpackConfTravis;
    config.reporters.push('coverage');
    // Configure code coverage reporter
    config.coverageReporter = {
      dir: 'coverage/',
      reporters: [
        { type: 'lcovonly', subdir: '.' },
        { type: 'json', subdir: '.' },
      ],
    };
  } else {
    config.webpack = webpackConf;
    config.browsers = ['Chrome'];
  }
};
