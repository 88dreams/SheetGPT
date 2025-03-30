import { useCallback, useMemo, useState } from 'react';
import { EntityType } from '../../../../types/sports';
import { FieldDefinition } from '../types';

interface UseFieldDetectionProps {
  isMounted?: React.MutableRefObject<boolean>;
}

/**
 * Hook for detecting and organizing fields for the bulk edit modal
 */
export default function useFieldDetection({ isMounted }: UseFieldDetectionProps = {}) {
  // State to track detected fields
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  
  // Categorize fields by type
  const fieldsByCategory = useMemo(() => {
    // Skip if no fields
    if (!fields || fields.length === 0) {
      return {};
    }
    
    // Define categories
    const categories: Record<string, FieldDefinition[]> = {
      "Basic Information": [],
      "Relationships": [],
      "Dates & Numbers": [],
      "Other": []
    };
    
    // Categorize each field
    fields.forEach(field => {
      if (['name', 'nickname', 'type', 'description', 'region', 'city', 'country', 'state'].includes(field.name)) {
        categories["Basic Information"].push(field);
      } else if (field.name.endsWith('_id') && field.name !== 'id') {
        categories["Relationships"].push(field);
      } else if (
        ['date', 'time', 'year', 'number', 'boolean', 'datetime'].includes(field.type) || 
        field.name.includes('date') || 
        field.name.includes('year')
      ) {
        categories["Dates & Numbers"].push(field);
      } else {
        categories["Other"].push(field);
      }
    });
    
    // Remove empty categories
    const result: Record<string, FieldDefinition[]> = {};
    for (const [category, categoryFields] of Object.entries(categories)) {
      if (categoryFields.length > 0) {
        result[category] = categoryFields;
      }
    }
    
    return result;
  }, [fields]);
  
  // Detect fields based on entity type or query results
  const detectFields = useCallback((entityType: string | null, sampleItem?: any) => {
    // If entity type is provided, use predefined field definitions
    if (entityType) {
      // This is a simplified implementation - will be replaced with actual API call
      const commonFields = [
        { name: 'name', type: 'string', required: true, description: 'Name of the entity' }
      ];
      
      const entitySpecificFields: Record<string, FieldDefinition[]> = {
        'league': [
          { name: 'sport', type: 'string', required: true, description: 'Sport type' },
          { name: 'country', type: 'string', required: true, description: 'Country' }
        ],
        'team': [
          { name: 'city', type: 'string', required: true, description: 'City' },
          { name: 'country', type: 'string', required: true, description: 'Country' }
        ],
        // Add more entity types as needed
      };
      
      // Combine common fields with entity-specific fields
      const detectedFields = [
        ...commonFields,
        ...(entitySpecificFields[entityType] || [])
      ];
      
      setFields(detectedFields);
    } 
    // If sample item is provided, extract fields from it
    else if (sampleItem) {
      const detectedFields = Object.keys(sampleItem).map(name => {
        const value = sampleItem[name];
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
      
      setFields(detectedFields);
    }
    // If neither is provided, reset fields
    else {
      setFields([]);
    }
  }, []);
  
  return {
    fields,
    fieldsByCategory,
    detectFields
  };
}