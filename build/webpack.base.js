/**
 * Created by TY-xie on 2018/3/26.
 */
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const VueLoaderPlugin = require('vue-loader').VueLoaderPlugin;

const baseConfig = mode => {
  const DEV = mode === 'development'
  const config = {
	resolve: {
	  extensions: ['.js'],
	},
	output: {
	  path: path.resolve(__dirname, '../lib'),
	  filename: '[name]/index.js',
	  publicPath: './',
	},
	module: {
	  rules: [
		{
		  test: /(\.jsx|\.js)$/,
		  use: {
			loader: 'babel-loader',
		  },
		  exclude: /(node_modules)/,
		},
		{
		  test: /\.vue$/,
		  use: {
			loader: 'vue-loader',
		  },
		},
		{
		  test: /\.css$/,
		  use: [
			DEV ?
				{loader: 'style-loader'} :
				MiniCssExtractPlugin.loader,
			{
			  loader: 'css-loader',
			},
		  ],
		},
		{
		  test: /(\.less)$/,
		  use: [
			DEV ?
				{loader: 'style-loader'} :
				MiniCssExtractPlugin.loader,
			{loader: 'css-loader'},
			{loader: 'postcss-loader'},
			{loader: 'less-loader'},
		  ],
		},
	  ],
	},
	plugins: [
	  new VueLoaderPlugin(),
	],
  };

  if (!DEV) {
	config.plugins.push(
		new MiniCssExtractPlugin({
		  filename: 'imageUploader.css',
		}),
	)
  }

  return config

};

module.exports = baseConfig;

// 将路径起点指向../src/pages
function pages(p) {
  return path.join(__dirname, '../src/vue-pages', p)
}

function root(p) {
  return path.join(__dirname, '..', p)
}
