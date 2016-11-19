const config = {};

config.devtool = 'inline-source-map';

// Initialize module
config.module = {
  preLoaders: [],
  loaders: [{
    test: /\.js$/,
    loader: 'babel-loader?plugins=babel-plugin-rewire',
    exclude: /node_modules/,
  }, {
    test: /\.json$/,
    loader: 'json',
  }],
};

config.plugins = [];

module.exports = config;
