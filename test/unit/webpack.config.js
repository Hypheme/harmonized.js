const path = require('path');


module.exports = function makeWebpackConfig() {
  /**
   * Config
   * Reference: http://webpack.github.io/docs/configuration.html
   * This is the object where all configuration gets set
   */
  const config = {};

  config.devtool = 'inline-source-map';

  // Initialize module
  config.module = {
    preLoaders: [],
    loaders: [{
      test: /\.js$/,
      loaders: ['babel'],
      exclude: /node_modules/,
    }, {
      test: /\.json$/,
      loader: 'json',
    }],
  };

  // ISPARTA LOADER
  // Reference: https://github.com/ColCh/isparta-instrumenter-loader
  // Instrument JS files with Isparta for subsequent code coverage reporting
  // Skips node_modules and files that end with .test.js

  config.module.preLoaders.push({
    test: /\.js$/,
    include: [
      path.resolve(__dirname, '../../src')],
    loader: 'isparta-instrumenter',
  });

  config.plugins = [];

  return config;
}();
