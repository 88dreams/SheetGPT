import { EntityType } from "../../../../types/sports";

/**
 * Utility functions for the BulkEditModal component
 */

/**
 * Get title text based on mode
 */
export const getModalTitle = (
  isEntityMode: boolean, 
  entityType?: EntityType, 
  selectedIds: string[] = [], 
  selectedIndexes: Set<number> = new Set()
): string => {
  if (isEntityMode && entityType) {
    return `Bulk Edit ${selectedIds.length} ${entityType}(s)`;
  } else {
    return `Bulk Edit ${selectedIndexes.size} Selected Row${selectedIndexes.size !== 1 ? 's' : ''}`;
  }
};

/**
 * Check if an entity is likely a team based on its properties
 */
export const isLikelyTeam = (entity: any): boolean => {
  return (
    entity.name && 
    (entity.city || entity.league_id) && 
    !entity.sport // Not a league
  );
};

/**
 * Format field name for display
 */
export const formatFieldName = (name: string): string => {
  if (name === 'division_conference_id') return 'Division / Conference';
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get field description with special handling for specific fields
 */
export const getFieldDescription = (name: string, defaultDescription: string): string => {
  if (name === 'division_conference_id') {
    return 'Select the division or conference this team belongs to';
  }
  return defaultDescription;
};