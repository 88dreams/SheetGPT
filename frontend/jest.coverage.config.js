// Jest configuration for coverage reporting
import baseConfig from './jest.config.js';

export default {
  ...baseConfig,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/main.tsx',
    '!src/env.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 0, // Start with 0% requirements, gradually increase as coverage improves
      branches: 0,
      functions: 0,
      lines: 0,
    },
    './src/components/': {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
    './src/utils/': {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
};