#!/usr/bin/env node

/**
 * Dependency backup script
 * 
 * This script creates backups of critical dependencies' package.json files
 * to enable later restoration if something breaks.
 */

const fs = require('fs');
const path = require('path');

console.log('📦 Backing up critical dependencies...');

// Define critical dependencies to backup
const CRITICAL_DEPS = [
  '@tanstack/react-query',
  'react',
  'react-dom',
  '@ant-design/cssinjs',
  'antd',
  '@ant-design/icons',
  'vite'
];

// Create backups directory if it doesn't exist
const backupDir = path.resolve('./node_modules/.backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Created backup directory: ${backupDir}`);
}

// Backup each critical dependency
CRITICAL_DEPS.forEach(depName => {
  try {
    const depPath = path.resolve(`./node_modules/${depName}/package.json`);
    
    if (!fs.existsSync(depPath)) {
      console.warn(`⚠️ Dependency not found: ${depName}`);
      return;
    }
    
    const backupPath = path.join(backupDir, `${depName.replace('/', '_')}.package.json.bak`);
    fs.copyFileSync(depPath, backupPath);
    console.log(`✅ Backed up ${depName} to ${backupPath}`);
    
  } catch (err) {
    console.error(`❌ Failed to backup ${depName}:`, err.message);
  }
});

// Also backup package.json and package-lock.json
try {
  const packageJsonPath = path.resolve('./package.json');
  const packageLockPath = path.resolve('./package-lock.json');
  
  fs.copyFileSync(packageJsonPath, path.join(backupDir, 'package.json.bak'));
  console.log('✅ Backed up package.json');
  
  if (fs.existsSync(packageLockPath)) {
    fs.copyFileSync(packageLockPath, path.join(backupDir, 'package-lock.json.bak'));
    console.log('✅ Backed up package-lock.json');
  }
} catch (err) {
  console.error('❌ Failed to backup package files:', err.message);
}

console.log('🎉 Backup complete!');