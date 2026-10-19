const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['builds/**', 'build-logs/**', 'ios/**', 'android/**', '.expo/**', 'dist/**'] },
]);
