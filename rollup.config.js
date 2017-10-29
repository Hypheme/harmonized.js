import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';
import gzip from 'rollup-plugin-gzip';
import uglify from 'rollup-plugin-uglify';
import sourcemaps from 'rollup-plugin-sourcemaps';

const doMinify = process.env.MINIFY === 'true';

const suffix = doMinify ? '.min' : '';

export default {
  input: './src/index.js',
  external: ['mobx', 'lodash', 'lodash/fp', 'glob-to-regexp', 'uuid/v4'],
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
