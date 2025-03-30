# Troubleshooting Guide

This document covers common issues and solutions for the SheetGPT application.

## Entity Display Issues

### Production Services Display

**Problem:** Production Services view showing UUIDs in Name column and "N/A" in Company fields.

**Root Cause:** 
- `ProductionService.production_company_id` references `Brand.id`, not `ProductionCompany.id`
- This Brand-centric architecture wasn't properly reflected in UI components

**Solution:**
1. Updated `ProductionServiceService` to populate `production_company_name` using Brand data
2. Fixed join queries to correctly reference Brand table
3. Updated UI to prioritize correct display columns
4. Added population script for `production_companies` table for backward compatibility

**Key Technical Details:**
- The system has evolved to a Brand-centric model where Brands can serve as Production Companies
- Field naming reflects historical design rather than current architecture
- Relationships are maintained for backward compatibility

### Entity Name Resolution Issues

**Problem:** Entities failing to resolve with proper names or showing incorrect relationships.

**Solution:**
1. Check entity name resolver implementation for missing JOIN conditions
2. Verify schema includes all necessary relationship fields
3. Ensure relationship tables have correct reference constraints
4. Update entity name resolver to include cross-entity fallback logic

## Authentication Issues

**Problem:** Google Sheets export fails with 401/403 errors.

**Solution:**
1. Check Google API credentials in environment variables
2. Verify OAuth scopes include both Sheets and Drive access
3. Implement CSV fallback for unauthenticated scenarios
4. Add explicit authentication verification before export attempts

## Database Migration Issues

**Problem:** Alembic migration failures with circular dependencies.

**Solution:**
1. Follow `src/scripts/README_ALEMBIC.md` guidelines for proper migration order
2. Use `--dependency override` for breaking circular dependencies
3. Split complex migrations into multiple steps when needed
4. See `docs/ALEMBIC_GUIDE.md` for comprehensive solutions

## Performance Issues

**Problem:** Slow entity list loading or export operations.

**Solution:**
1. Check database query performance with EXPLAIN
2. Verify proper indexing on frequently queried fields
3. Implement pagination correctly on both frontend and backend
4. Use batch processing for large export operations
5. Run `src/scripts/db_vacuum.py` to optimize database performance

## React State Management Issues

### Pagination State Synchronization

**Problem:** Pagination component doesn't properly update when changing from larger to smaller page sizes (e.g., 50 to 25 to 10).

**Root Cause:**
- State update order dependency between currentPage and pageSize
- Circular dependencies in component state updates
- Update cycles triggering "Maximum update depth exceeded" errors

**Solution:**
1. Ensure state updates happen in correct order - set page to 1 BEFORE changing page size:
   ```typescript
   function onPageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
     const newSize = parseInt(e.target.value, 10);
     setCurrentPage(1);  // First reset page
     setPageSize(newSize); // Then change page size
   }
   ```

2. Use refs to track previous values and prevent redundant updates:
   ```typescript
   const prevPageSizeRef = useRef(pageSize);
   
   // Only update if value actually changed
   if (newSize !== prevPageSizeRef.current) {
     prevPageSizeRef.current = newSize;
     setPageSize(newSize);
   }
   ```

3. Implement explicit dependency tracking in useEffect hooks:
   ```typescript
   // Correctly specify dependencies to avoid infinite loops
   useEffect(() => {
     // Only run when both dependencies have meaningful changes
     if (dependencyA !== prevDependencyARef.current) {
       // Update state here
     }
   }, [dependencyA, dependencyB]);
   ```

4. In extreme cases, use setTimeout to break update cycles:
   ```typescript
   setTimeout(() => {
     setDerivedState(newValue);
   }, 0);
   ```

### Maximum Update Depth Exceeded Errors

**Problem:** Console shows "Maximum update depth exceeded" errors in React components.

**Root Cause:**
- Components calling setState inside useEffect without proper dependency arrays
- Circular dependencies between state values
- Effect dependencies changing on every render
- Missing checks for value changes before setState calls

**Solution:**
1. Add proper dependency arrays to ALL useEffect hooks
2. Track previous values with useRef to prevent update loops
3. Add explicit change detection before calling setState
4. Break circular dependencies by restructuring component logic
5. Use React.memo with custom equality functions for frequently re-rendered components
6. Implement useCallback for handler functions passed to child components
7. Use proper identity comparisons for objects and arrays
8. Consider simplifying complex state interdependencies
9. Use React DevTools Profiler to identify excessive re-renders