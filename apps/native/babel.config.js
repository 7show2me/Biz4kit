/* oxlint-disable unicorn/prefer-module, node/global-require -- Metro and Babel load CommonJS config */
module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [require("@varlock/expo-integration/babel-plugin")],
};
