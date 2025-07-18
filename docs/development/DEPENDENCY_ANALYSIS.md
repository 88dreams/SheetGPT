# TanStack React Query Dependency Issue Analysis

## Problem Description

The project is experiencing a persistent dependency resolution error with `@tanstack/react-query`. The error appears during the Vite build process when it tries to scan dependencies:

```text
Failed to resolve entry for package "@tanstack/react-query". The package may have incorrect main/module/exports specified in its package.json.
```

The core issue is that the codebase expects to use TanStack React Query v4.29.5, but npm is somehow resolving or installing v5.66.8 instead. The module structures between these versions are different, causing Vite's module resolution to fail.

## Root Cause Analysis

1. **Version Mismatch**: The code was written for TanStack React Query v4.29.5, but v5.66.8 is being installed.
2. **Package Structure Changes**: The v5.x series has significantly different module structure and exports.
3. **Resolution Persistence**: Despite explicit version pinning in package.json, npm continues to install v5.x.
4. **Docker Volume Persistence**: Node modules in Docker volumes persist even after git resets or clean builds.

## Approaches Tried

### 1. Running fixDependencies.sh script

- **Action**: Executed the existing fixDependencies.sh script designed to address this specific issue.
- **Result**: Failed to resolve the issue. Script installs specific packages but they get overridden.

### 2. Manual Package Reinstallation

- **Action**: Manually removed and reinstalled @tanstack/react-query with exact version.
- **Command**: `rm -rf node_modules/@tanstack && npm install @tanstack/react-query@4.29.5 --save-exact`
- **Result**: Despite explicitly specifying v4.29.5, version 5.66.8 was still installed.

### 3. Docker Container Rebuild

- **Action**: Complete rebuild of Docker containers with clean dependencies.
- **Command**: `docker-compose down -v && docker-compose build --no-cache && docker-compose up`
- **Result**: Issue persisted; still getting v5.66.8 installed.

### 4. Package.json Modifications

- **Action**: Added resolutions/overrides field to package.json to force specific versions.

```json
"overrides": {
  "@tanstack/react-query": "4.29.5",
  "@tanstack/query-core": "4.29.5"
}
```

- **Result**: Overrides were inconsistently applied; the v5.66.8 version persisted.

### 5. Creating Custom Dockerfile

- **Action**: Created a modified Dockerfile with specific steps to handle dependencies.
- **Changes**: Added explicit npm install commands with --force and --save-exact flags.
- **Result**: Failed due to npm version constraints - Node 18 couldn't use latest npm.

### 6. Direct node_modules Modification

- **Action**: Directly modified package.json in the installed @tanstack/react-query package to claim version 4.29.5.
- **Result**: Version number changed but module structure remained incompatible.

### 7. Creating Compatibility Adapter

- **Action**: Created a compatibility adapter module (utils/query-adapter.ts) to bridge v5 API to v4 API expected by codebase.
- **Result**: Failed because this only addressed individual imports, not all module references across the codebase.

### 8. Package Aliasing Approach

- **Action**: Tried to create a custom npm package within node_modules that would re-export v4 API.
- **Steps**:
  1. Created tanstack-compat package in node_modules
  2. Downloaded original v4.29.5 package to tanstack-original
  3. Set up alias in package.json: `"@tanstack/react-query": "npm:tanstack-compat@4.29.5"`
  4. Made compatibility package re-export from original v4 package
- **Result**: Package resolution failed due to path issues and npm resolution conflicts.

### 9. Vite Config Aliasing

- **Action**: Modified vite.config.ts to add import aliases for the packages.

```js
resolve: {
  alias: {
    '@tanstack/react-query': path.resolve(__dirname, './node_modules/tanstack-original/build/lib'),
    '@tanstack/query-core': path.resolve(__dirname, './node_modules/tanstack-original/node_modules/@tanstack/query-core'),
  }
}
```

- **Result**: Vite still experienced package resolution errors during dependency scanning.

## Key Observations

1. Despite explicit version pinning, npm consistently resolves to v5.66.8
2. The node_modules volume in Docker persists across rebuilds, potentially maintaining corruption
3. None of the standard npm mechanisms (overrides, resolutions, explicit installs) corrected the issue
4. The error occurs at the Vite dependency scanning phase, before any code is actually executed

## Potential Next Steps

1. Try using a completely different package manager (pnpm or yarn)
2. Implement a more radical version of the compatibility adapter approach
3. Try downgrading Vite itself, as the module resolution issues might be Vite-specific
4. Manually duplicate the entire v4 API structure but with v5 internals
5. Analyze if any indirect dependencies might be forcing the v5 upgrade
6. Create an interceptor at the Node.js module resolution level

## Resolution Summary (May 7, 2025)

The persistent dependency issue was ultimately resolved through a combination of approaches:

1. **Package Manager Change:** Switched from `npm` to `yarn` for frontend dependency management.
2. **Dockerfile Correction:**
    - Removed explicit `npm install -g yarn` as it was likely pre-installed in the base image.
    - Replaced multi-step `npm install` commands with a single `yarn install --frozen-lockfile`.
    - Added `RUN rm -rf node_modules/.vite` after installation to explicitly clear Vite's cache.
    - Corrected the final `CMD` to execute Vite using its direct path (`./node_modules/.bin/vite`) instead of relying on `npm run` or `yarn dev` path resolution.
3. **`.dockerignore`:** Created `frontend/.dockerignore` including `node_modules` to prevent the `COPY . .` step in the Dockerfile from overwriting the container's installed dependencies with local ones.
4. **Volume Management:** Identified that Docker anonymous volumes for `/app/node_modules` (defined in `docker-compose.yml`) were preserving an incorrect state (containing Vite v5) across container restarts. Running `docker-compose down -v` cleared these stale volumes.
5. **Version Pinning:** Pinned exact versions for `vite` (`4.2.1`) and `@tanstack/react-query` (`4.29.5`) in `package.json` to prevent unexpected upgrades during resolution.

After implementing these steps, the correct version of Vite (v4.2.1) was consistently used within the container, and the `Failed to resolve entry for package "@tanstack/react-query"` error during Vite's dependency scan was resolved.
