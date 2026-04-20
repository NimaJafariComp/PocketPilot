const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const config = getDefaultConfig(__dirname);
const workspaceRoot = path.resolve(__dirname, '../..');
const projectNodeModules = path.resolve(projectRoot, 'node_modules');
const workspaceNodeModules = path.resolve(workspaceRoot, 'node_modules');

function resolvePackagePath(request) {
  return path.dirname(
    require.resolve(`${request}/package.json`, {
      paths: [projectNodeModules, workspaceNodeModules],
    }),
  );
}

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [projectNodeModules, workspaceNodeModules];
config.resolver.disableHierarchicalLookup = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  nativewind: resolvePackagePath('nativewind'),
  'react-native-css-interop': resolvePackagePath('react-native-css-interop'),
  react: resolvePackagePath('react'),
  'react/jsx-runtime': require.resolve('react/jsx-runtime', {
    paths: [projectNodeModules, workspaceNodeModules],
  }),
  'react/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime', {
    paths: [projectNodeModules, workspaceNodeModules],
  }),
  'react-native': resolvePackagePath('react-native'),
  semver: resolvePackagePath('semver'),
  tailwindcss: resolvePackagePath('tailwindcss'),
};

module.exports = withNativeWind(config, {
  input: './src/styles/global.css',
  configPath: './tailwind.config.js',
});
