import { EntityType } from "../../../../../types/sports";

/**
 * Format cell values for display in the table
 */
export function formatCellValue(value: any, field: string, entityType?: EntityType, showFullUuids: boolean = false): string {
  // Skip if no value
  if (value === null || value === undefined) return 'N/A';
  
  // Special case for name field in broadcast entities - strip out the territory part
  if (field === 'name' && entityType === 'broadcast_rights' && typeof value === 'string') {
    const parts = value.split(' - ');
    if (parts.length > 1) {
      return parts[0]; // Only show the broadcast company name part
    }
  }
  
  // For production services or broadcast rights, don't use the name field at all
  if (field === 'name' && (entityType === 'production_service' || entityType === 'broadcast_rights')) {
    return entityType === 'production_service' ? 'See Production Company' : 'See Broadcast Company';
  }
  
  // Remove (Brand) text from company names
  if ((field === 'production_company_name' || field === 'broadcast_company_name') && typeof value === 'string') {
    return value.replace(' (Brand)', '');
  }
  
  // Format dates
  if (field.includes('date') && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch (e) {
      return String(value);
    }
  }
  
  // Check if it's a UUID by format
  if (typeof value === 'string' && 
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    // Return full UUID if toggle is on, otherwise truncate
    return showFullUuids ? value : `${value.substring(0, 8)}...`;
  }
  
  // For boolean fields
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // For any other field type
  return String(value);
}

/**
 * Determine if a field is a relationship field (ID field with corresponding name field)
 */
export function isRelationshipField(field: string, entity: any): boolean {
  return field.endsWith('_id') && `${field.replace('_id', '_name')}` in entity;
}

/**
 * Determines if a field is a sortable relationship field
 * This includes both ID fields with corresponding name fields
 * and direct relationship name fields.
 */
export function isSortableRelationshipField(field: string, entities: any[]): boolean {
  if (entities.length === 0) return false;
  
  // Known relationship sort fields
  const knownRelationshipFields = [
    'league_name', 
    'league_sport',
    'division_conference_name',
    'team_name',
    'stadium_name',
    'broadcast_company_name',
    'production_company_name',
    'entity_name'
  ];
  
  if (knownRelationshipFields.includes(field)) {
    return true;
  }
  
  // Check if it's an ID field with a corresponding _name field
  if (field.endsWith('_id') && entities[0]?.hasOwnProperty(field.replace('_id', '_name'))) {
    return true;
  }
  
  return false;
}

/**
 * Get display value for a field (handles IDs vs names for relationships)
 */
export function getDisplayValue(entity: any, field: string, entityType?: EntityType, showFullUuids: boolean = false): string {
  // Special case for territory field in broadcast entities
  if (field === 'territory' && entityType === 'broadcast_rights') {
    // If the territory value is directly in the field, use it
    if (entity.territory) {
      return formatCellValue(entity.territory, field, entityType, showFullUuids);
    }
    
    // Otherwise try to extract from name if using combined format
    if (entity.name && typeof entity.name === 'string' && entity.name.includes(' - ')) {
      const parts = entity.name.split(' - ');
      if (parts.length > 1) {
        return formatCellValue(parts[1], field, entityType, showFullUuids); // Return the territory part
      }
    }
  }
  
  // Special case for production services entity name field
  if (field === 'entity_name' && entityType === 'production_service' && !entity.entity_name && entity.entity_type) {
    // If entity_name is missing but we have entity_type and entity_id, construct a display name
    if (entity.entity_id) {
      // For special entity types like Championship/Playoffs that might use string entity_id
      if (typeof entity.entity_id === 'string' && !entity.entity_id.includes('-')) {
        return entity.entity_id; // If entity_id is not a UUID, use it as the name
      }
      
      // For Championships/Playoffs with UUID ids
      if (entity.entity_type.toLowerCase() === 'championship' || entity.entity_type.toLowerCase().includes('playoff')) {
        return entity.entity_type;
      }
    }
  }
  
  // Handle relationship fields (showing names instead of IDs)
  if (isRelationshipField(field, entity) && !showFullUuids) {
    // Show the name instead of the ID when showing names
    return formatCellValue(entity[field.replace('_id', '_name')], field, entityType, showFullUuids);
  }
  
  // Default case
  return formatCellValue(entity[field], field, entityType, showFullUuids);
}

/**
 * Get entity type display name
 */
export function getEntityTypeName(entityType: EntityType): string {
  const entityTypes = [
    { id: 'league', name: 'Leagues' },
    { id: 'division_conference', name: 'Divisions/Conferences' },
    { id: 'team', name: 'Teams' },
    { id: 'player', name: 'Players' },
    { id: 'game', name: 'Games' },
    { id: 'stadium', name: 'Stadiums' },
    { id: 'broadcast_rights', name: 'Broadcast Rights' },
    { id: 'production_service', name: 'Production Services' },
    { id: 'brand', name: 'Brand Relationships' },
    { id: 'game_broadcast', name: 'Game Broadcasts' },
    { id: 'league_executive', name: 'League Executives' }
  ];
  return entityTypes.find(e => e.id === entityType)?.name || entityType;
}