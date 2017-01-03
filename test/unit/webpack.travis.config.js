const _ = require('lodash');
const path = require('path');
const baseConfig = require('./webpack.config.js');
const config = _.cloneDeep(baseConfig);

config.isparta = {
  embedSource: true,
  noAutoWrap: true,
  babel: {
    plugins: 'babel-plugin-rewire',
  },
};

config.module.loaders[0].loader = 'babel-loader';
config.module.preLoaders.push({
  test: /\.js$/,
  include: path.resolve(__dirname, '../../src'),
  exclude: /\.spec\.js/,
  loader: 'isparta',
});

module.exports = config;
