# Dependency Troubleshooting Guide

## Common Errors and Solutions

### 1. Failed to resolve entry for package @tanstack/react-query

**Error Message:**
```
[plugin:vite:import-analysis] Failed to resolve entry for package "@tanstack/react-query". The package may have incorrect main/module/exports specified in its package.json.
```

**Solution:**
1. Run the fix script:
   ```bash
   ./fix-frontend-esbuild.sh
   ```

2. If that doesn't work, rebuild with the stable configuration:
   ```bash
   docker-compose down -v
   docker-compose -f docker-compose.stable.yml up frontend-stable
   ```

3. Manual fix inside container:
   ```bash
   docker-compose exec frontend bash
   cd /app
   rm -rf node_modules/@tanstack
   npm install @tanstack/react-query@4.29.5 --save-exact
   ```

### 2. esbuild version mismatch

**Error Message:**
```
✘ [ERROR] Cannot start service: Host version "0.18.20" does not match binary version "0.17.19"
```

**Solution:**
1. Fix esbuild version:
   ```bash
   docker-compose exec frontend bash
   cd /app
   rm -rf node_modules/esbuild
   npm install esbuild@0.17.19 --save-exact
   ```

2. Or run the comprehensive fix script:
   ```bash
   ./fix-frontend-esbuild.sh
   ```

### 3. React version conflicts

**Symptoms:**
- Cryptic React errors about invalid hooks
- Component rendering issues
- React-Query specific warnings

**Solution:**
1. Check installed versions:
   ```bash
   docker-compose exec frontend bash
   cd /app
   npm list react react-dom
   ```

2. Fix if needed:
   ```bash
   npm install react@18.2.0 react-dom@18.2.0 --save-exact
   ```

## Root Causes

### 1. Docker Volume Persistence

When running with docker-compose, node_modules are mounted as volumes and persist even when you do a git reset. This means dependency issues can persist despite code changes.

**Solution:** Use named volumes or rebuild from scratch:
```bash
docker-compose down -v  # Remove volumes
docker-compose build --no-cache frontend
```

### 2. npm Version Resolution

npm may install newer versions of packages despite your package.json constraints, especially with nested dependencies.

**Solution:** Use exact versions with the `--save-exact` flag and lock critical dependencies.

### 3. ES Modules vs CommonJS

Vite uses ES modules while some packages expect CommonJS, leading to import resolution issues.

**Solution:** For critical packages, ensure they support ES modules or have proper exports configurations.

## Prevention Strategies

1. **Use Dependency Validation**
   - Add check-deps.js to your CI/CD pipeline
   - Run validation before starting development

2. **Use Fixed Versions**
   - All critical dependencies should use exact versions (no ^ or ~)
   - Use npm ci instead of npm install for clean installs

3. **Backup Working State**
   - Create backup scripts for node_modules
   - Document known-good versions

4. **Use Separate Docker Environment**
   - Maintain a stable Docker environment (docker-compose.stable.yml)
   - Use named volumes for node_modules

## Complete Recovery Process

If all else fails, this process will completely reset your environment:

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove any lingering containers
docker ps -a | grep sheetgpt | awk '{print $1}' | xargs docker rm -f

# Remove dangling images to ensure clean rebuild
docker images -f "dangling=true" -q | xargs docker rmi

# Build from scratch with no cache
docker-compose build --no-cache

# Start with the stable configuration
docker-compose -f docker-compose.stable.yml up frontend-stable
```

If you're still having issues, try removing the entire node_modules directory on the host machine and rebuilding.