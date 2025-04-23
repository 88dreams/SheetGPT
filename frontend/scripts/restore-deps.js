#!/usr/bin/env node

/**
 * Dependency restoration script
 * 
 * This script restores backups of critical dependencies' package.json files
 * to revert to a known good state after a breaking change.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Restoring critical dependencies from backups...');

// Define critical dependencies to restore
const CRITICAL_DEPS = [
  '@tanstack/react-query',
  'react',
  'react-dom',
  '@ant-design/cssinjs',
  'antd',
  '@ant-design/icons',
  'vite'
];

// Check if backups directory exists
const backupDir = path.resolve('./node_modules/.backups');
if (!fs.existsSync(backupDir)) {
  console.error('❌ Backup directory not found. Run backup-deps.js first.');
  process.exit(1);
}

// Restore each critical dependency
CRITICAL_DEPS.forEach(depName => {
  try {
    const depDirPath = path.resolve(`./node_modules/${depName}`);
    const depPath = path.join(depDirPath, 'package.json');
    const backupPath = path.join(backupDir, `${depName.replace('/', '_')}.package.json.bak`);
    
    if (!fs.existsSync(backupPath)) {
      console.warn(`⚠️ Backup not found for ${depName}`);
      return;
    }
    
    if (!fs.existsSync(depDirPath)) {
      fs.mkdirSync(depDirPath, { recursive: true });
    }
    
    fs.copyFileSync(backupPath, depPath);
    console.log(`✅ Restored ${depName} from backup`);
    
  } catch (err) {
    console.error(`❌ Failed to restore ${depName}:`, err.message);
  }
});

// Ask if user wants to reinstall dependencies
console.log('\n📝 Restoration complete!');
console.log('ℹ️ You may need to run "npm install" to ensure dependencies are properly linked.');
console.log('ℹ️ If you continue to experience issues, try running "npm run reinstall-deps"');

// Optionally reinstall dependencies automatically
try {
  if (process.argv.includes('--reinstall')) {
    console.log('\n🔄 Reinstalling dependencies automatically...');
    execSync('npm install --no-save', { stdio: 'inherit' });
    console.log('✅ Dependencies reinstalled!');
  }
} catch (err) {
  console.error('❌ Failed to reinstall dependencies:', err.message);
}