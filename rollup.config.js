import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import gzip from 'rollup-plugin-gzip';
import uglify from 'rollup-plugin-uglify';
import sourcemaps from 'rollup-plugin-sourcemaps';

const doMinify = process.env.MINIFY === 'true';

const suffix = doMinify ? '.min' : '';

export default {
  input: './src/index.js',
  external: [
    'mobx',
    'lodash/differenceWith',
    'lodash/get',
    'lodash/set',
    'lodash/pick',
    'lodash/merge',
    'lodash/isPlainObject',
    'glob-to-regexp',
    'uuid/v4',
  ],
  globals: {
    mobx: 'mobx',
    'uuid/v4': 'uuid',
    'lodash/set': 'set',
    'lodash/get': 'get',
    'lodash/differenceWith': 'differenceWith',
    'lodash/isPlainObject': 'isPlainObject',
    'glob-to-regexp': 'globToRegexp',
  },
  output: [{
    file: `lib/harmonized${suffix}.js`,
    format: 'cjs',
  }, {
    file: `lib/harmonized.umd${suffix}.js`,
    format: 'umd',
  }, ...(doMinify ? [] : [{
    file: `lib/harmonized.module${suffix}.js`,
    format: 'es',
  }])],
  sourcemap: true,
  name: 'harmonized',
  plugins: [
    nodeResolve(),
    babel({
      exclude: 'node_modules/**',
      plugins: ['external-helpers'],
    }),
    gzip(),
    sourcemaps(),
    ...(doMinify ? [uglify()] : []),
  ],
};
