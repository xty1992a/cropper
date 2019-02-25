/*
 config for build umd module to use
 * */
const path = require('path');
const base = require('./webpack.base');
const merge = require('webpack-merge');
const root = p => path.join(__dirname, '..', p);
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const argv = process.argv;
const showBundle = argv.includes('report');

module.exports = (env, argv) => (merge(base(argv.mode), {
  mode: 'production',
  entry: root('src/package/main.js'),
  output: {
	path: path.resolve(__dirname, '../dist'),
	filename: 'bundle.js',
	publicPath: '/',
  },
  performance: false,
  optimization: {
	minimize: true,
  },
  plugins: [
	// new BundleAnalyzerPlugin(),
  ],
}));
