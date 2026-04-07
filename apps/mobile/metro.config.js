const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');

function resolvePackagePath(request) {
  return path.dirname(
    require.resolve(`${request}/package.json`, {
      paths: [__dirname, workspaceRoot],
    }),
  );
}

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  react: resolvePackagePath('react'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime', {
    paths: [__dirname, workspaceRoot],
  }),
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime', {
    paths: [__dirname, workspaceRoot],
  }),
  'react-native': resolvePackagePath('react-native'),
};

module.exports = withNativeWind(config, {
  input: './src/styles/global.css',
  configPath: './tailwind.config.js',
});
