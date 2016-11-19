const _ = require('lodash');
const path = require('path');
const baseConfig = require('./webpack.config.js');
const config = _.cloneDeep(baseConfig);

config.debug = false;

config.isparta = {
  embedSource: true,
  noAutoWrap: true,
  babel: {
    plugins: 'rewire',
  },
};

config.module.preLoaders.push({
  test: /\.js$/,
  include: [
    path.resolve(__dirname, '../../src')],
  exclude: /\.spec\.js/,
  loader: 'isparta',
});

module.exports = config;
