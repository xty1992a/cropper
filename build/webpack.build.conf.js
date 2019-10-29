/*
 config for build umd module to use
 * */
const path = require("path");
const base = require("./webpack.base");
const merge = require("webpack-merge");
process.env.NODE_ENV = "production";
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

const root = p => path.resolve(__dirname, "..", p);
const workspace = root(".");

module.exports = () => (merge(base({root, workspace}), {
  mode: "production",
  entry: root("src/package/main.js"),
  output: {
    path: path.resolve(__dirname, "../lib"),
    filename: "cropper.js",
    publicPath: "/",
    library: "Cropper",
    libraryTarget: "umd",
    libraryExport: "default", // 需要暴露的模块
    umdNamedDefine: true,
  },
  performance: false,
  optimization: {
    minimize: true,
  },
  plugins: [
    // new BundleAnalyzerPlugin(),
  ],
}));
