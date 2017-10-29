const config = {};

config.devtool = 'inline-source-map';

// Initialize module
config.module = {
  loaders: [{
    test: /\.js$/,
    loader: 'babel-loader',
    exclude: /node_modules/,
    options: {
      plugins: [
        'transform-decorators-legacy',
      ],
    },
  }, {
    test: /\.json$/,
    loader: 'json',
  }],
};

config.plugins = [
];

module.exports = config;
