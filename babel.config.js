module.exports = {
  presets: [
    [
      "@babel/preset-env"
      /*	  {
			  "modules": "commonjs",
			  "useBuiltIns": "usage"
			}*/
    ]
  ],
  plugins: [
    "@babel/plugin-proposal-class-properties",
    [
      "@babel/plugin-transform-runtime",
      {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: true
      }
    ]
  ]
};
