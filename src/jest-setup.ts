// This file is imported in jest.config.js as setupFilesAfterEnv
import '@testing-library/jest-dom';

// This extends Jest's expect with the DOM matchers
// The import above automatically adds all the matchers to Jest

// Mock console.error to prevent React errors about act() from cluttering the test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out specific warnings
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    (args[0].includes('Warning: An update to') && 
     args[0].includes('inside a test was not wrapped in act'))
  ) {
    return;
  }
  originalConsoleError(...args);
}; 