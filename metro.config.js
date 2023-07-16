const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push(
  'bin', // whisper.rn: ggml model binary
  'mil', // whisper.rn: CoreML model asset
);

module.exports = config;