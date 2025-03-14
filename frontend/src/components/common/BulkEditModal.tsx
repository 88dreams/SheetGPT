/**
 * Unified BulkEditModal Component
 * 
 * This is a standardized component that supports two modes of operation:
 * 1. Entity Mode: For editing multiple entities from the EntityList component
 * 2. Query Mode: For editing multiple query results from the DatabaseQuery component
 * 
 * Key features:
 * - Dynamically determines fields based on entity type or query results
 * - Loads relationship data for dropdown fields
 * - Ensures division_conference_id is always available for team entities
 * - Detects entity types automatically in query mode
 * - Groups fields into logical categories
 * 
 * Current limitations:
 * - Authentication issues when used in entity mode (still investigating)
 * - Currently only the query mode implementation is used (in DatabaseQuery.tsx)
 * - EntityList.tsx still uses its own separate BulkEditModal implementation
 * 
 * The goal is to replace both implementations with this unified version.
 */

import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { EntityType } from '../../types/sports';
import SportsDatabaseService from '../../services/SportsDatabaseService';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from './LoadingSpinner';
import { apiClient } from '../../utils/apiClient';

interface BulkEditModalProps {
  visible: boolean;
  onCancel: () => void;
  // For entity-based bulk editing
  entityType?: EntityType;
  selectedIds?: string[];
  // For query-based bulk editing
  queryResults?: any[];
  selectedIndexes?: Set<number>;
  // Common props
  onSuccess: (updatedData?: any) => void;
}

/**
 * Unified BulkEditModal component that can be used for both:
 * 1. Entity-based bulk editing (from the entities page)
 * 2. Query results bulk editing (from the query page)
 */
const BulkEditModal: React.FC<BulkEditModalProps> = ({
  visible,
  onCancel,
  entityType,
  selectedIds = [],
  queryResults = [],
  selectedIndexes = new Set<number>(),
  onSuccess,
}) => {
  const { showNotification } = useNotification();
  const isEntityMode = Boolean(entityType && selectedIds.length > 0);
  const isQueryMode = Boolean(queryResults.length > 0 && selectedIndexes.size > 0);
  
  // State for fields and their values
  const [availableFields, setAvailableFields] = useState<any[]>([]);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  
  // State for related entities (for dropdowns)
  const [relatedEntities, setRelatedEntities] = useState<Record<string, any[]>>({});
  
  // Processing states
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<{success: number; failed: number}>({success: 0, failed: 0});
  const [showResults, setShowResults] = useState(false);

  // Load available fields when the modal becomes visible
  useEffect(() => {
    if (visible) {
      if (isEntityMode) {
        loadEntityFields();
      } else if (isQueryMode) {
        loadQueryFields();
      }
    } else {
      // Reset state when modal closes
      setSelectedFields({});
      setFieldValues({});
      setShowResults(false);
    }
  }, [visible, entityType, queryResults]);

  // Load field definitions for entity-based mode
  const loadEntityFields = async () => {
    if (!entityType) return;
    
    setIsLoading(true);
    try {
      // Get fields from the context - to replace with API call when available
      const fields = getEntityFieldsFromContext(entityType);
      
      // Filter out read-only fields like id, created_at, updated_at
      const editableFields = fields.filter(field => 
        !['id', 'created_at', 'updated_at'].includes(field.name)
      );
      
      setAvailableFields(editableFields);
      
      // Also load related entities for dropdowns
      await loadRelatedEntities(editableFields);
    } catch (error) {
      console.error('Error loading fields:', error);
      showNotification('error', `Failed to load fields: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load fields from query results for query-based mode
  const loadQueryFields = () => {
    if (!queryResults.length) return;
    
    setIsLoading(true);
    try {
      // Extract field info from the first result
      const firstResult = queryResults[0];
      
      // Check if this result looks like a team (has name, city fields)
      const isTeam = firstResult.name && 
                   (firstResult.city || firstResult.league_id) && 
                   !firstResult.sport; // Not a league

      console.log("Entity detection:", isTeam ? "Team detected" : "Other entity type");
      
      // Extract base fields from the result
      let fields = Object.keys(firstResult).map(name => {
        const value = firstResult[name];
        const type = typeof value === 'number' ? 'number' : 
                    typeof value === 'boolean' ? 'boolean' :
                    (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) ? 'datetime' :
                    'string';
        
        return {
          name,
          type,
          required: false,
          description: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
      });
      
      // For teams, ensure division_conference_id is always included
      if (isTeam && !fields.some(f => f.name === 'division_conference_id')) {
        console.log("Adding division_conference_id to team fields (was missing)");
        fields.push({
          name: 'division_conference_id',
          type: 'string',
          required: true,
          description: 'Division/Conference ID'
        });
      }
      
      setAvailableFields(fields);
      
      // Load related entities for relationship fields
      loadRelatedEntitiesForQuery(fields);
    } catch (error) {
      console.error('Error processing query fields:', error);
      showNotification('error', `Failed to process fields: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Temporary function to get field definitions until API is available
  const getEntityFieldsFromContext = (entityType: EntityType) => {
    // This is a simplified implementation - will be replaced with actual API call
    const commonFields = [
      { name: 'id', type: 'string', required: false, description: 'Unique identifier' },
      { name: 'name', type: 'string', required: true, description: 'Name of the entity' },
      { name: 'created_at', type: 'datetime', required: false, description: 'Creation timestamp' },
      { name: 'updated_at', type: 'datetime', required: false, description: 'Last update timestamp' }
    ];
    
    const entitySpecificFields: Record<EntityType, any[]> = {
      'league': [
        { name: 'nickname', type: 'string', required: false, description: 'League nickname or abbreviation (e.g., NFL, NBA)' },
        { name: 'sport', type: 'string', required: true, description: 'Sport type' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'founded_year', type: 'number', required: false, description: 'Year founded' }
      ],
      'division_conference': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'type', type: 'string', required: true, description: 'Type (Division, Conference)' },
        { name: 'region', type: 'string', required: false, description: 'Region (East, West, etc)' }
      ],
      'team': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'division_conference_id', type: 'string', required: true, description: 'Division/Conference ID' },
        { name: 'city', type: 'string', required: true, description: 'City' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'state', type: 'string', required: false, description: 'State/Province' },
        { name: 'founded_year', type: 'number', required: false, description: 'Year founded' }
      ],
      'player': [
        { name: 'team_id', type: 'string', required: true, description: 'Team ID' },
        { name: 'position', type: 'string', required: true, description: 'Position' }
      ],
      'game': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'home_team_id', type: 'string', required: true, description: 'Home Team ID' },
        { name: 'away_team_id', type: 'string', required: true, description: 'Away Team ID' },
        { name: 'date', type: 'date', required: true, description: 'Game Date' }
      ],
      'stadium': [
        { name: 'city', type: 'string', required: true, description: 'City' },
        { name: 'country', type: 'string', required: true, description: 'Country' },
        { name: 'capacity', type: 'number', required: false, description: 'Capacity' }
      ],
      'broadcast': [
        { name: 'broadcast_company_id', type: 'string', required: true, description: 'Broadcast Company ID' },
        { name: 'entity_type', type: 'string', required: true, description: 'Entity Type' },
        { name: 'entity_id', type: 'string', required: true, description: 'Entity ID' }
      ],
      'production': [
        { name: 'production_company_id', type: 'string', required: true, description: 'Production Company ID' },
        { name: 'entity_type', type: 'string', required: true, description: 'Entity Type' },
        { name: 'entity_id', type: 'string', required: true, description: 'Entity ID' }
      ],
      'brand': [
        { name: 'industry', type: 'string', required: true, description: 'Industry' }
      ],
      'game_broadcast': [
        { name: 'game_id', type: 'string', required: true, description: 'Game ID' },
        { name: 'broadcast_company_id', type: 'string', required: true, description: 'Broadcast Company ID' }
      ],
      'league_executive': [
        { name: 'league_id', type: 'string', required: true, description: 'League ID' },
        { name: 'position', type: 'string', required: true, description: 'Position' }
      ]
    };
    
    return [...commonFields, ...(entitySpecificFields[entityType] || [])];
  };

  // Load related entities for foreign key fields for entity-based mode
  const loadRelatedEntities = async (fields: any[]) => {
    const foreignKeyFields = fields.filter(field => 
      field.name.endsWith('_id') && field.name !== 'id'
    );
    
    const relatedData: Record<string, any[]> = {};
    
    // Load data for each foreign key field
    for (const field of foreignKeyFields) {
      try {
        // Extract entity type from field name (e.g., "league_id" -> "league")
        let relatedEntityType = field.name.replace('_id', '') as EntityType;
        
        // Special handling for division_conference - use direct endpoint
        if (relatedEntityType === 'division_conference') {
          console.log("Using direct endpoint for division/conference");
          try {
            const response = await apiClient.get('/sports/divisions-conferences');
            
            // Add league name mapping if not included
            const items = response.data.map((item: any) => {
              if (!item.league_name && item.league_id) {
                return { ...item, league_name: "League" };
              }
              return item;
            });
            
            relatedData[field.name] = items;
            console.log(`Loaded ${items.length} division/conference items`);
            continue; // Skip the generic entity approach
          } catch (error) {
            console.error('Error fetching division/conferences:', error);
            continue;
          }
        }
        
        // Skip if this isn't a valid entity type
        if (!['league', 'team', 'player', 'game', 'stadium', 'broadcast', 'broadcast_company', 'production_company'].includes(relatedEntityType)) {
          console.log(`Skipping unsupported entity type: ${relatedEntityType}`);
          continue;
        }
        
        const response = await SportsDatabaseService.getEntities({
          entityType: relatedEntityType,
          page: 1,
          limit: 100
        });
        
        relatedData[field.name] = response.items || [];
      } catch (error) {
        console.error(`Error loading options for ${field.name}:`, error);
      }
    }
    
    setRelatedEntities(relatedData);
  };

  // Load related entities for query-based mode
  const loadRelatedEntitiesForQuery = async (fields: any[]) => {
    // Special handling for division_conference_id - we'll use direct API call later
    const isDivisionConferencePresent = fields.some(f => f.name === 'division_conference_id');
    
    // Map of relationship field names to entity types
    const relationshipMap: Record<string, string> = {
      'league_id': 'league',
      'team_id': 'team',
      'stadium_id': 'stadium',
      'broadcast_company_id': 'broadcast_company',
      'production_company_id': 'production_company',
      'game_id': 'game',
      'player_id': 'player'
    };
    
    // Log all fields for debugging
    console.log("Fields for relationship detection:", fields.map(f => f.name));
    
    // Always include division_conference_id for teams
    const isTeam = (
      queryResults.length > 0 && 
      queryResults[0].name && 
      (queryResults[0].city || queryResults[0].league_id) && 
      !queryResults[0].sport
    );
    
    const fieldNames = fields.map(field => field.name);
    if (isTeam && !fieldNames.includes('division_conference_id')) {
      console.log("This is a team! Explicitly ensuring division_conference_id relationships will be loaded");
      // Make sure division_conference_id is in the list of fields to load
      fields.push({
        name: 'division_conference_id',
        type: 'string',
        required: true
      });
    }
    
    // Get relationships to load 
    // Using 'let' instead of 'const' since we'll add to this array for teams
    let relationshipFields = fields
      .filter(field => field.name.endsWith('_id') && field.name !== 'id' && relationshipMap[field.name])
      .map(field => ({
        field: field.name,
        entityType: relationshipMap[field.name]
      }));
    
    // Also directly add division_conference for teams even if not in results
    if (isTeam && !relationshipFields.some(r => r.field === 'division_conference_id')) {
      relationshipFields.push({
        field: 'division_conference_id',
        entityType: 'division_conference'
      });
    }
    
    console.log("Will fetch these relationships:", relationshipFields);
    
    // Load division/conference separately with direct endpoint
    if (isDivisionConferencePresent) {
      try {
        console.log("Loading division/conference data with direct endpoint");
        const response = await apiClient.get('/sports/divisions-conferences');
        
        // Add league name mapping if needed
        const items = response.data.map((item: any) => {
          if (!item.league_name && item.league_id) {
            return { ...item, league_name: "League" };
          }
          return item;
        });
        
        setRelatedEntities(prev => ({
          ...prev,
          'division_conference_id': items
        }));
        console.log(`Loaded ${items.length} division/conference items directly`);
      } catch (error) {
        console.error('Error fetching division conferences:', error);
      }
    }
    
    // For each relationship field, fetch the related entities
    for (const relationship of relationshipFields) {
      // Skip division_conference_id as we handle it separately
      if (relationship.field === 'division_conference_id') {
        continue;
      }
      
      try {
        console.log(`Fetching ${relationship.entityType} data for ${relationship.field} field`);
        
        const response = await apiClient.get('/sports/entities', {
          params: {
            entityType: relationship.entityType,
            page: 1,
            limit: 100
          }
        });
        
        if (response.data && response.data.items) {
          setRelatedEntities(prev => ({
            ...prev,
            [relationship.field]: response.data.items
          }));
          console.log(`Loaded ${response.data.items.length} ${relationship.entityType} items for ${relationship.field}`);
        }
      } catch (error) {
        console.error(`Error fetching ${relationship.entityType} for ${relationship.field}:`, error);
      }
    }
  };

  // Toggle field selection
  const toggleField = (fieldName: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  // Update field value
  const updateFieldValue = (fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Process bulk update in entity mode
  const handleEntityBulkUpdate = async () => {
    // Get all selected fields
    const fieldsToUpdate = Object.entries(selectedFields)
      .filter(([_, isSelected]) => isSelected)
      .map(([fieldName, _]) => fieldName);
    
    if (fieldsToUpdate.length === 0) {
      showNotification('warning', 'Please select at least one field to update');
      return;
    }
    
    // Create update payload with only the selected fields
    const updateData: Record<string, any> = {};
    fieldsToUpdate.forEach(fieldName => {
      // Only include fields that have values
      // If a field is empty, it means "clear this field"
      updateData[fieldName] = fieldValues[fieldName] === undefined ? null : fieldValues[fieldName];
    });
    
    setIsProcessing(true);
    setResults({ success: 0, failed: 0 });
    
    try {
      if (!entityType) throw new Error('Entity type is required');
      
      // Process in batches of 10
      const batchSize = 10;
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = selectedIds.slice(i, i + batchSize);
        
        // Process each entity in the batch
        for (const id of batch) {
          try {
            // Use a direct API call rather than SportsDatabaseService to avoid auth issues
            await apiClient.put(`/sports/entities/${entityType}/${id}`, updateData);
            succeeded++;
          } catch (error) {
            console.error(`Error updating entity ${id}:`, error);
            failed++;
          }
          
          // Update progress after each entity
          processed++;
          setProcessingProgress(Math.round((processed / selectedIds.length) * 100));
          setResults({ success: succeeded, failed });
        }
      }
      
      setShowResults(true);
      
      // Show notification based on results
      if (failed === 0) {
        showNotification('success', `Successfully updated ${succeeded} ${entityType}(s)`);
        
        // After a delay, close and refresh
        setTimeout(() => {
          onSuccess();
          onCancel();
        }, 1500);
      } else {
        showNotification('warning', `Updated ${succeeded} items with ${failed} failures`);
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      showNotification('error', `Error during bulk update: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process bulk update in query mode
  const handleQueryBulkUpdate = async () => {
    // Get all selected fields
    const fieldsToUpdate = Object.entries(selectedFields)
      .filter(([_, isSelected]) => isSelected)
      .map(([fieldName, _]) => fieldName);
    
    if (fieldsToUpdate.length === 0) {
      showNotification('warning', 'Please select at least one field to update');
      return;
    }
    
    // Create update payload with only the selected fields
    const updateData: Record<string, any> = {};
    fieldsToUpdate.forEach(fieldName => {
      // Only include fields that have values
      // If a field is empty string, treat as "clear this field"
      updateData[fieldName] = fieldValues[fieldName] === undefined ? null : fieldValues[fieldName];
    });
    
    setIsProcessing(true);
    setResults({ success: 0, failed: 0 });
    
    try {
      // Create a copy of the results array
      const updatedResults = [...queryResults];
      
      // Process in batches of 10
      const batchSize = 10;
      let processed = 0;
      let successes = 0;
      let failures = 0;
      
      // Convert Set to Array for easier iteration
      const selectedIndexArray = Array.from(selectedIndexes);
      
      for (let i = 0; i < selectedIndexArray.length; i += batchSize) {
        const batch = selectedIndexArray.slice(i, i + batchSize);
        
        // Process each row in the batch
        batch.forEach(index => {
          try {
            // Update each selected field in the result object
            Object.entries(updateData).forEach(([field, value]) => {
              updatedResults[index][field] = value;
            });
            successes++;
          } catch (error) {
            console.error(`Error updating row ${index}:`, error);
            failures++;
          }
        });
        
        // Update progress
        processed += batch.length;
        setProcessingProgress(Math.round((processed / selectedIndexArray.length) * 100));
        setResults({ success: successes, failed: failures });
        
        // Small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setShowResults(true);
      
      // Show notification based on results
      if (failures === 0) {
        showNotification('success', `Successfully updated ${successes} rows`);
        
        // After a delay, close and refresh
        setTimeout(() => {
          onSuccess(updatedResults);
          onCancel();
        }, 1500);
      } else {
        showNotification('warning', `Updated ${successes} rows with ${failures} failures`);
      }
    } catch (error) {
      console.error('Error during bulk update:', error);
      showNotification('error', `Error during bulk update: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine the right handler based on mode
  const handleBulkUpdate = () => {
    if (isEntityMode) {
      handleEntityBulkUpdate();
    } else if (isQueryMode) {
      handleQueryBulkUpdate();
    }
  };

  // Render a field input based on its type
  const renderFieldInput = (field: any) => {
    const { name, type } = field;
    
    // Handle foreign key/relationship fields with dropdowns
    if (name.endsWith('_id') && relatedEntities[name]?.length > 0) {
      // Get the entity type from the field name (e.g., league_id -> League)
      const entityLabel = name.replace('_id', '').replace(/^\w/, c => c.toUpperCase());
      
      // For division_conference_id, sort by league name and then division name
      let sortedEntities = [...relatedEntities[name]];
      if (name === 'division_conference_id') {
        sortedEntities.sort((a, b) => {
          // First sort by league name
          const leagueA = a.league_name || '';
          const leagueB = b.league_name || '';
          
          if (leagueA !== leagueB) {
            return leagueA.localeCompare(leagueB);
          }
          
          // Then sort by division name
          return (a.name || '').localeCompare(b.name || '');
        });
      }
      
      return (
        <select
          value={fieldValues[name] || ''}
          onChange={(e) => updateFieldValue(name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
        >
          <option value="">{`Select ${entityLabel}...`}</option>
          {sortedEntities.map(entity => (
            <option key={entity.id} value={entity.id}>
              {name === 'division_conference_id' 
                ? `${entity.name} (${entity.league_name || 'Unknown League'})` 
                : entity.name || entity.id}
            </option>
          ))}
        </select>
      );
    }
    
    // Special handling for nickname field
    if (name === 'nickname') {
      return (
        <input
          type="text"
          value={fieldValues[name] || ''}
          onChange={(e) => updateFieldValue(name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
          placeholder={selectedFields[name] ? "Enter league nickname (e.g., NFL, NBA)" : ""}
        />
      );
    }
    
    // Number fields
    if (type === 'number') {
      return (
        <input
          type="number"
          value={fieldValues[name] || ''}
          onChange={(e) => updateFieldValue(name, e.target.value === '' ? '' : Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
        />
      );
    }
    
    // Date fields
    if (type === 'date') {
      return (
        <input
          type="date"
          value={fieldValues[name] || ''}
          onChange={(e) => updateFieldValue(name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
        />
      );
    }
    
    // Datetime fields
    if (type === 'datetime') {
      return (
        <input
          type="datetime-local"
          value={fieldValues[name] || ''}
          onChange={(e) => updateFieldValue(name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
        />
      );
    }
    
    // Boolean fields
    if (type === 'boolean') {
      return (
        <select
          value={fieldValues[name]?.toString() || ''}
          onChange={(e) => updateFieldValue(name, e.target.value === 'true')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          disabled={!selectedFields[name]}
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    
    // Default to text input
    return (
      <input
        type="text"
        value={fieldValues[name] || ''}
        onChange={(e) => updateFieldValue(name, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        disabled={!selectedFields[name]}
        placeholder={selectedFields[name] ? "Enter value or leave empty to clear" : ""}
      />
    );
  };

  // Group fields by category
  const getFieldsByCategory = () => {
    // First, determine if we're dealing with a team entity
    const isTeam = isEntityMode 
      ? entityType === 'team'
      : (queryResults.length > 0 && queryResults[0].name && 
         (queryResults[0].city || queryResults[0].league_id) && 
         !queryResults[0].sport);
    
    // Ensure division_conference_id is included for teams
    let fieldList = [...availableFields];
    
    // Special handling for teams: ensure division_conference_id is present
    if (isTeam && !fieldList.some(f => f.name === 'division_conference_id')) {
      console.log("Adding division_conference_id to available fields for team");
      fieldList.push({
        name: 'division_conference_id',
        type: 'string',
        required: true,
        description: 'Division/Conference ID'
      });
      
      // Also make sure to fetch the data if not already loaded
      if (!relatedEntities['division_conference_id']) {
        console.log("Loading division conference data for dropdown selection");
        
        // Use an immediately invoked async function to handle the async operation
        (async () => {
          try {
            // Use the direct sportsService method for this endpoint
            const response = await apiClient.get('/sports/divisions-conferences');
            
            if (response.data) {
              // Add league name mapping if not included
              const items = response.data.map((item: any) => {
                // If the item doesn't have a league_name but has a league_id, add a placeholder
                if (!item.league_name && item.league_id) {
                  console.log("Adding placeholder league name for division:", item.name);
                  return { ...item, league_name: "League" };
                }
                return item;
              });
              
              setRelatedEntities(prev => ({
                ...prev,
                'division_conference_id': items
              }));
              console.log(`Successfully loaded ${items.length} division conference items`);
            } else {
              console.warn("No data received from divisions-conferences endpoint");
            }
          } catch (error) {
            console.error('Error fetching division conferences:', error);
          }
        })();
      }
    }
    
    const categories = {
      "Basic Information": fieldList.filter(f => 
        ['name', 'nickname', 'type', 'description', 'region', 'city', 'country', 'state'].includes(f.name)),
      "Relationships": fieldList.filter(f => 
        f.name.endsWith('_id') && f.name !== 'id'),
      "Dates & Numbers": fieldList.filter(f => 
        ['date', 'time', 'year', 'number', 'boolean', 'datetime'].includes(f.type) || 
        f.name.includes('date') || 
        f.name.includes('year')),
      "Other": fieldList.filter(f => 
        !['name', 'nickname', 'type', 'description', 'region', 'city', 'country', 'state'].includes(f.name) && 
        !f.name.endsWith('_id') && 
        !['date', 'time', 'year', 'number', 'boolean', 'datetime'].includes(f.type) &&
        !f.name.includes('date') && 
        !f.name.includes('year'))
    };
    
    // Only return categories that have fields
    return Object.entries(categories)
      .filter(([_, fields]) => fields.length > 0)
      .reduce((acc, [category, fields]) => {
        acc[category] = fields;
        return acc;
      }, {} as Record<string, any[]>);
  };

  // Get title text based on mode
  const getTitle = () => {
    if (isEntityMode && entityType) {
      return `Bulk Edit ${selectedIds.length} ${entityType}(s)`;
    } else if (isQueryMode) {
      return `Bulk Edit ${selectedIndexes.size} Selected Row${selectedIndexes.size !== 1 ? 's' : ''}`;
    }
    return 'Bulk Edit';
  };

  return (
    <Modal
      title={getTitle()}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <LoadingSpinner size="medium" />
          <span className="ml-2">Loading fields...</span>
        </div>
      ) : isProcessing ? (
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Processing Updates</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Processing {processingProgress}% complete...
          </p>
        </div>
      ) : showResults ? (
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4">Update Complete</h3>
          <div className="flex justify-between mb-4">
            <div className="text-green-600">
              <span className="font-bold">{results.success}</span> updates successful
            </div>
            {results.failed > 0 && (
              <div className="text-red-600">
                <span className="font-bold">{results.failed}</span> updates failed
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 max-h-[70vh] overflow-y-auto pr-2">
            {Object.entries(getFieldsByCategory()).map(([_, fields]) => (
              <div key={_}>
                {fields.map((field) => (
                  <div key={field.name} className="border border-gray-200 rounded-md p-3 mb-2">
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id={`field-${field.name}`}
                        checked={!!selectedFields[field.name]}
                        onChange={() => toggleField(field.name)}
                        className="h-4 w-4 mr-2"
                      />
                      <label
                        htmlFor={`field-${field.name}`}
                        className="font-medium text-gray-700 cursor-pointer"
                      >
                        {field.name === 'division_conference_id' 
                          ? 'Division / Conference' 
                          : field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                    
                    <div className="ml-6">
                      <p className="text-sm text-gray-500 mb-2">
                        {field.name === 'division_conference_id' 
                          ? 'Select the division or conference this team belongs to' 
                          : field.description}
                      </p>
                      {renderFieldInput(field)}
                      {selectedFields[field.name] && fieldValues[field.name] === '' && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ This field will be cleared if left empty
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={Object.values(selectedFields).filter(Boolean).length === 0}
            >
              {isEntityMode 
                ? `Update ${selectedIds.length} Items` 
                : `Update ${selectedIndexes.size} Rows`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BulkEditModal;