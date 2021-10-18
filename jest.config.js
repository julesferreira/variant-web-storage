// jest.config.js
// Sync object
/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  globals: { 'ts-jest': { tsconfig: { target: 'es6' } } },
  testPathIgnorePatterns: ['.cache', 'dist'],
  transformIgnorePatterns: [
    '[/\\\\]node_modules[/\\\\](?!@digitak).+\\.(js|jsx)$',
  ],
};

module.exports = config;
