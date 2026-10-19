const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Preserve Expo's asset defaults; bundle the original untextured miniature offline.
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'glb'])];
module.exports = config;
