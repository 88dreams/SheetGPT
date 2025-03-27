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