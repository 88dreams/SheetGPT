# Dependency Stability Guide for SheetGPT

This guide addresses recurring issues with dependency resolution, particularly with @tanstack/react-query and React packages that have caused build failures in the past.

## Quick Fix Instructions

If you're experiencing the "Failed to resolve entry for package '@tanstack/react-query'" error:

1. **Stop all running containers**:
   ```bash
   docker-compose down
   ```

2. **Start the stable environment**:
   ```bash
   docker-compose -f docker-compose.stable.yml up frontend-stable
   ```

3. **Alternatively, fix dependencies inside container**:
   ```bash
   # Execute inside the container
   docker-compose exec frontend sh -c "cd /app && ./fixDependencies.sh"
   ```

## Common Dependency Issues

### 1. Version Mismatches

The application requires specific versions of critical dependencies:
- @tanstack/react-query: 4.29.5 (NOT version 5.x)
- react: 18.2.0 (NOT 18.3.x or 19.x)
- react-dom: 18.2.0 (NOT 18.3.x or 19.x)
- vite: 4.2.1 (NOT 5.x)

### 2. Module Resolution Problems

- ES Modules vs CommonJS conflicts
- Incorrect package.json "exports" field resolution
- Type imports causing runtime issues

### 3. Docker-specific Issues

- Cached node_modules that persist between builds
- Environment variables affecting module resolution
- Differences between development and production builds

## Preventative Measures

### 1. Dependency Validation

The project now includes dependency validation scripts:

```bash
# In development mode (warns but continues)
npm run validate-deps:warn

# In build/production mode (fails on mismatch)
npm run validate-deps
```

### 2. Backup and Restore

```bash
# Backup working dependencies
npm run backup-deps

# Restore from backup (add --reinstall to also run npm install)
npm run restore-deps
```

### 3. Use Stable Environment

For critical development work, use the stable Docker environment:

```bash
docker-compose -f docker-compose.stable.yml up frontend-stable
```

## Troubleshooting Steps

### If the frontend fails to start:

1. **Check environment variables**:
   ```bash
   docker-compose exec frontend env | grep VITE
   ```

2. **Inspect node_modules**:
   ```bash
   docker-compose exec frontend sh -c "ls -la /app/node_modules/@tanstack/react-query"
   docker-compose exec frontend sh -c "cat /app/node_modules/@tanstack/react-query/package.json | grep version"
   ```

3. **Verify import resolution**:
   ```bash
   docker-compose exec frontend sh -c "npx vite optimize --force"
   ```

4. **Clean and reinstall dependencies**:
   ```bash
   docker-compose exec frontend sh -c "cd /app && rm -rf node_modules package-lock.json && npm install"
   ```

### For persistent issues:

1. Rebuild containers from scratch:
   ```bash
   docker-compose down -v
   docker-compose build --no-cache
   docker-compose up
   ```

2. Try the fixed dependency installer script:
   ```bash
   docker-compose exec frontend sh -c "cd /app && ./fixDependencies.sh"
   ```

3. Use the stable environment configuration:
   ```bash
   docker-compose -f docker-compose.stable.yml up frontend-stable
   ```

## Root Cause Analysis

The main issues are typically caused by:

1. NPM installing newer incompatible versions despite package.json constraints
2. Docker volume mounting causing unexpected module sharing between host and container
3. Vite's ES module resolution behavior differing from Node.js CommonJS
4. Peer dependency conflicts between packages
5. Duplicated environment variables causing import resolution to differ

When a git reset doesn't fix the problem, it's usually because the node_modules directory is persisted in a Docker volume and not reset with the git operation.

## Long-term Solution

Moving forward, the project will:
1. Lock all critical dependencies to exact versions
2. Use named volumes for node_modules to prevent host interference
3. Maintain multiple Dockerfile configurations for different scenarios
4. Implement validation checking in CI/CD pipelines
5. Document all dependency constraints thoroughly