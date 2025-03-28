import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  // Add /tests as a root directory for test lookup
  roots: ['<rootDir>', '/tests'],
  // Match any test files in our target directory
  testMatch: [
    '**/frontend/components/sports/database/EntityList/*.test.+(ts|tsx)'
  ],
  // Make sure modules can be resolved from either app or tests directory
  moduleDirectories: ['node_modules', '/tests']
};