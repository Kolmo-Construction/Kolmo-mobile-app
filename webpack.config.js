const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  env.port = 5000;
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  config.devServer = config.devServer || {};
  config.devServer.allowedHosts = 'all';
  config.devServer.host = '0.0.0.0';
  config.devServer.port = 5000;
  
  return config;
};
