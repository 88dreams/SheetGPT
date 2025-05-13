# Development To-Do (Secondary Priority)

This file lists development tasks and concerns that are necessary to address at some point but are not critical for immediate functionality.

## Frontend

-   **Resolve Persistent Linter/Type Errors:**
    -   **File:** `frontend/src/features/DataManagement/hooks/useDataSelection.ts`
    -   **Issue:** The editor consistently shows linter/type errors for imports from `@tanstack/react-query` and `react-router-dom` (e.g., "Cannot find module '@tanstack/react-query' or its corresponding type declarations.") despite the packages being correctly installed, the application building successfully, and the code functioning as expected.
    -   **Potential Investigation Steps:**
        -   Thoroughly restart Dev Container and editor.
        -   Check VS Code/Cursor workspace settings for TypeScript/ESLint overrides.
        -   Verify `node_modules` recognition by the editor's TypeScript service (e.g., "Go to Type Definition" should work).
        -   As a last resort, consider fully clearing `node_modules` and `yarn.lock` locally, then rebuilding the container and `yarn install` from scratch to ensure the editor's environment is completely fresh.

-   **Update Outdated Dependencies:**
    -   **Location:** `frontend/package.json`
    -   **Issue:** `yarn install` reports warnings for several outdated dependencies (e.g., `eslint`, `rimraf`, `glob`) and an unmet peer dependency for `@testing-library/user-event`.
    -   **Action:** Periodically review and update these dependencies to their latest stable versions, addressing any breaking changes or configuration updates required. 