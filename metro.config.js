const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple blockList to ignore the corrupted directory
config.resolver.blockList = [
  /node_modules[/\\]react-devtools-core[/\\]dist[/\\].*/
];

module.exports = config;
