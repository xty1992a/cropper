const path = require("path");

const baseConfig = ({ root, workspace }) => {
  return {
    entry: {},
    resolve: {
      extensions: [".js", ".ts", ".tsx"],
      alias: {
        "@": path.resolve(workspace, "src")
      }
    },
    output: {
      path: root("lib"),
      filename: "[name].js"
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: "babel-loader",
          exclude: /node_modules/
        },
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: "ts-loader",
              options: {
                configFile: root("tsconfig.json")
              }
            }
          ],
          exclude: /node_modules/
        }
      ]
    },
    plugins: []
  };
};

module.exports = baseConfig;
