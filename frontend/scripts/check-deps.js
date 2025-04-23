#!/usr/bin/env node

/**
 * Dependency validation script
 * 
 * This script ensures critical dependencies are at the correct versions
 * to prevent runtime issues. It compares installed versions with
 * the versions specified in package.json.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk') || { red: (s) => s, green: (s) => s, yellow: (s) => s, blue: (s) => s };

// Set to true to only warn on validation errors instead of failing
const WARN_ONLY = process.env.WARN_ONLY === 'true';

console.log('🔍 Validating critical dependencies...');

// Get package.json content
const packageJsonPath = path.resolve('./package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Define critical dependencies that must be exact matches
const CRITICAL_DEPS = {
  '@tanstack/react-query': packageJson.dependencies['@tanstack/react-query'],
  'react': packageJson.dependencies['react'],
  'react-dom': packageJson.dependencies['react-dom'],
  '@ant-design/cssinjs': packageJson.dependencies['@ant-design/cssinjs'],
  'antd': packageJson.dependencies['antd'],
  '@ant-design/icons': packageJson.dependencies['@ant-design/icons']
};

// Validation function
function validateDependencies() {
  console.log('Critical dependencies to validate:');
  Object.entries(CRITICAL_DEPS).forEach(([name, version]) => {
    console.log(`  ${name}: ${version}`);
  });

  let isValid = true;
  const validationResults = [];

  // Check each critical dependency
  Object.entries(CRITICAL_DEPS).forEach(([depName, expectedVersion]) => {
    try {
      // Try to get the installed version
      const depPath = path.resolve(`./node_modules/${depName}/package.json`);
      
      if (!fs.existsSync(depPath)) {
        validationResults.push({
          name: depName,
          expected: expectedVersion,
          installed: 'NOT INSTALLED',
          valid: false
        });
        isValid = false;
        return;
      }
      
      const installedPackage = JSON.parse(fs.readFileSync(depPath, 'utf8'));
      const installedVersion = installedPackage.version;
      
      // Simple version check (exact match for critical dependencies)
      const versionMatch = expectedVersion.startsWith('^') || expectedVersion.startsWith('~') 
        ? installedVersion.startsWith(expectedVersion.substring(1))
        : installedVersion === expectedVersion;

      validationResults.push({
        name: depName,
        expected: expectedVersion,
        installed: installedVersion,
        valid: versionMatch
      });
      
      if (!versionMatch) {
        isValid = false;
      }
    } catch (err) {
      console.error(`Failed to check ${depName}:`, err.message);
      isValid = false;
      validationResults.push({
        name: depName,
        expected: expectedVersion,
        installed: 'ERROR',
        valid: false
      });
    }
  });

  // Print validation results
  console.log('\nValidation Results:');
  validationResults.forEach(result => {
    const status = result.valid 
      ? chalk.green('✅ OK')
      : chalk.red('❌ MISMATCH');
      
    console.log(`${status} ${result.name}: expected ${chalk.blue(result.expected)}, got ${chalk.yellow(result.installed)}`);
  });

  if (!isValid && !WARN_ONLY) {
    console.error('\n❌ Dependency validation failed!');
    process.exit(1);
  } else if (!isValid && WARN_ONLY) {
    console.warn('\n⚠️ Dependency validation issues found (warning only)');
    console.warn('⚠️ See DEPENDENCY_STABILITY_IMPLEMENTATION.md for recommended fixes');
  } else {
    console.log('\n✅ All critical dependencies validated!');
  }
}

validateDependencies();