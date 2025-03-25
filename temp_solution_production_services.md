# Production Services Display Fix

## Problem Identified
In the Entities -> Production Services view, we had two main issues:
1. The "Name" column was displaying "Production Service" followed by a UUID instead of a proper display name
2. The "Production Company Name" and "Production Company ID" fields were showing as "N/A" despite existing in the backend

## Root Cause Analysis
1. The key issue was that the `production_company_id` in `ProductionService` actually references a `Brand` directly, not a `ProductionCompany`
2. The relationship between `ProductionService` and `Brand` was correct in the model, but the UI wasn't handling it properly
3. There were no entries in the `production_companies` table, which caused issues in other parts of the system
4. The model had a comment: "Note: This relationship is now maintained only for backwards compatibility. Production services now point to brands directly"

## Fix Applied
1. Updated the backend `ProductionServiceService` to ensure the `production_company_name` field is always populated:
   - Added fallback logic to look up the brand name directly if it's missing
   - Fixed the join query to ensure it correctly joins with the Brand table

2. Updated `add_production_constraint.py` as `add_production_constraint_fixed.py`:
   - Fixed the ProductionCompany creation code to match the database model
   - Ran this script to populate the production_companies table

3. Updated the frontend EntityList.tsx to properly display the data:
   - Prioritized production_company_name and entity_name columns
   - Set the name column to be hidden by default
   - Added logic to force column visibility settings for production services

## Testing
After applying these changes, the Production Services page now shows:
1. The "Production Company Name" correctly displays the brand name
2. The "Production Company ID" correctly shows the reference to the Brand
3. The "Entity Name" shows the correct entity type and name
4. The "Name" column is hidden by default, solving the display issue

## Technical Details
The root issue is in the database model design:
- `ProductionService.production_company_id` -> `Brand.id`
- NOT `ProductionService.production_company_id` -> `ProductionCompany.id`

This architecture reflects a system that was evolving from separate entity types toward a more unified Brand-based approach, but the UI wasn't fully updated to reflect this change.

## Future Improvements
1. Update other references to production_company to ensure they use brand relationships
2. Consider renaming fields for clarity (e.g., production_brand_id instead of production_company_id)
3. Add documentation about the Brand-centric architecture