const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .ppn files!
config.resolver.assetExts.push('ppn');

module.exports = config;
