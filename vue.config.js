// vue.config.js
module.exports = {
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      args[0].title = "ThreeJs Variable Points Demo";
      return args;
    });
  },

  configureWebpack: {
    devtool: "source-map",
  },
};
