import { EntityType, ENTITY_TYPES } from './entityTypes';

/**
 * Get a display-friendly name for an entity type
 */
export const getEntityTypeDisplayName = (entityType: EntityType): string => {
  const entityTypeInfo = ENTITY_TYPES.find(et => et.id === entityType);
  return entityTypeInfo?.name || entityType;
};

/**
 * Check if an entity type is valid
 */
export const isEntityTypeValid = (entityType: EntityType | string): boolean => {
  return ENTITY_TYPES.some(et => et.id === entityType);
};

/**
 * Get a field value from a record, with type safety
 */
export const getFieldValue = (record: Record<string, any>, fieldName: string): any => {
  if (!record || !fieldName) return undefined;
  return record[fieldName];
};

/**
 * Format a field value for display
 */
export const formatFieldValueForDisplay = (value: any): string => {
  if (value === undefined || value === null) return '';
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '');
    } catch (e) {
      return '[Complex Object]';
    }
  }
  
  return String(value);
};

/**
 * Get a color class based on the entity type
 */
export const getEntityTypeColorClass = (entityType: EntityType): string => {
  switch (entityType) {
    case 'league':
      return 'bg-blue-100 text-blue-800';
    case 'team':
      return 'bg-green-100 text-green-800';
    case 'player':
      return 'bg-yellow-100 text-yellow-800';
    case 'game':
      return 'bg-purple-100 text-purple-800';
    case 'stadium':
      return 'bg-red-100 text-red-800';
    case 'broadcast':
      return 'bg-indigo-100 text-indigo-800';
    case 'production':
      return 'bg-pink-100 text-pink-800';
    case 'brand':
      return 'bg-orange-100 text-orange-800';
    case 'game_broadcast':
      return 'bg-teal-100 text-teal-800';
    case 'league_executive':
      return 'bg-cyan-100 text-cyan-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get a border color class based on the entity type
 */
export const getEntityTypeBorderClass = (entityType: EntityType): string => {
  switch (entityType) {
    case 'league':
      return 'border-blue-300';
    case 'team':
      return 'border-green-300';
    case 'player':
      return 'border-yellow-300';
    case 'game':
      return 'border-purple-300';
    case 'stadium':
      return 'border-red-300';
    case 'broadcast':
      return 'border-indigo-300';
    case 'production':
      return 'border-pink-300';
    case 'brand':
      return 'border-orange-300';
    case 'game_broadcast':
      return 'border-teal-300';
    case 'league_executive':
      return 'border-cyan-300';
    default:
      return 'border-gray-300';
  }
};

/**
 * Get a badge class for field mapping status
 */
export const getFieldMappingStatusClass = (isMapped: boolean, isRequired: boolean): string => {
  if (isMapped) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (isRequired) {
    return 'bg-red-100 text-red-800 border-red-300';
  } else {
    return 'bg-gray-100 text-gray-500 border-gray-300';
  }
};

/**
 * Calculate mapping statistics for all entity types
 */
export const calculateMappingStats = (
  mappingsByEntityType: Record<string, Record<string, string>>
): Record<string, { total: number, required: number, mapped: number }> => {
  const stats: Record<string, { total: number, required: number, mapped: number }> = {};
  
  ENTITY_TYPES.forEach(entityType => {
    const requiredFields = entityType.requiredFields || [];
    const mappings = mappingsByEntityType[entityType.id] || {};
    const mappedFields = Object.keys(mappings);
    
    stats[entityType.id] = {
      total: requiredFields.length,
      required: requiredFields.length,
      mapped: mappedFields.length
    };
  });
  
  return stats;
}; 