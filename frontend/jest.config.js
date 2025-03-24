export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Handle module aliases (if you're using them in your project)
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock modules with import.meta.env
    '^src/utils/apiClient$': '<rootDir>/src/utils/apiClient.mock.ts',
    '^src/utils/api$': '<rootDir>/src/utils/api.mock.ts',
    '^src/services/SportsDatabaseService$': '<rootDir>/src/services/SportsDatabaseService.mock.ts'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json',
      isolatedModules: true // Skip type checking
    }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/jest-setup.ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!react-dnd|react-dnd-html5-backend|dnd-core)/'
  ]
};