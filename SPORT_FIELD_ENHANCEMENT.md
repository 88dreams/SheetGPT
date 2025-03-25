# Sport Field Enhancement Plan

## Current Status
- Sport is already implemented as a **required field** for Leagues.
- Sport field exists in the database model (`sports_models.py` line 36-39).
- Sport is properly displayed in the League edit form (`LeagueFields.tsx`).

## Needed Changes

### Backend Tasks
1. **Add Sport to Entity Name Resolution**
   - Update `entity_name_resolver.py` to include the sport field when resolving League entities.
   - Ensure sport field is included when returning Division/Conference entities.
   - Add a `league_sport` field to Team, Broadcast Rights, and Production Services.

2. **Modify Entity Response Schemas**
   - Update Pydantic schemas for related entities to include sport information:
     - Add `league_sport` field to DivisionConference responses
     - Add `league_sport` field to Team responses
     - Add `league_sport` field to BroadcastRights responses
     - Add `league_sport` field to ProductionService responses

3. **SQL Query Enhancement**
   - Add JOINs to the league table in queries for Teams, Broadcast Rights, etc.
   - Select the sport field from the league table in these queries.

### Frontend Tasks
1. **UI Display Updates**
   - Update column visibility settings to show sport field for:
     - Division/Conference
     - Team
     - Broadcast Rights
     - Production Services
     - Brand Relationships

2. **Form Updates**
   - Add a read-only sport field to related entity forms:
     - Division/Conference form with League's sport
     - Team form with League's sport
     - Broadcasting form with League's sport

3. **Entity Type Filtering by Sport**
   - Enhance entity filtering capability to filter by sport type
   - Add sport to the filter criteria in EntityList component

### Data Migration
1. **Sport Assignment Script**
   - Create a script to assign sports to existing leagues where the field might be empty
   - For NCAA: identify and mark different sports appropriately
   - Example sports to include:
     - Football
     - Basketball
     - Baseball
     - Hockey
     - Soccer
     - Tennis
     - Golf

### Testing
1. **Verify Display**
   - Test that sport displays correctly in all entity types
   - Ensure filtering by sport works as expected
   
2. **Test Relationships**
   - Verify that related entities show their league's sport field
   - Confirm that sport information is consistently displayed

## Implementation Strategy
1. First implement the backend changes to ensure data availability
2. Then update the frontend to display the sport field in appropriate views
3. Create and run the data migration script
4. Test and verify all changes

## Note for Implementers
The sport field already exists in the League database model and is correctly marked as required. This enhancement plan focuses on making the sport field visible and available across related entities, improving data consistency, and enabling filtering by sport type.

This implementation will be particularly useful for distinguishing between NCAA sports divisions and providing more context to broadcast rights and production services.