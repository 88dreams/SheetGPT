import { useCallback, useMemo, useState } from 'react';
import { FieldCategoryMap, FieldDefinition, FieldValuesMap, SelectedFieldsMap } from '../types';

interface UseFieldManagementProps {
  availableFields: FieldDefinition[];
}

/**
 * Hook for managing field selection, categorization, and values
 */
const useFieldManagement = ({ availableFields }: UseFieldManagementProps) => {
  // State for selected fields and their values
  const [selectedFields, setSelectedFields] = useState<SelectedFieldsMap>({});
  const [fieldValues, setFieldValues] = useState<FieldValuesMap>({});

  // Group fields by category - memoized to prevent recalculation on every render
  const fieldsByCategory = useMemo(() => {
    const categories = {
      "Basic Information": availableFields.filter(f => 
        ['name', 'nickname', 'type', 'description', 'region', 'city', 'country', 'state'].includes(f.name)),
      "Relationships": availableFields.filter(f => 
        f.name.endsWith('_id') && f.name !== 'id'),
      "Dates & Numbers": availableFields.filter(f => 
        ['date', 'time', 'year', 'number', 'boolean', 'datetime'].includes(f.type) || 
        f.name.includes('date') || 
        f.name.includes('year')),
      "Other": availableFields.filter(f => 
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
      }, {} as FieldCategoryMap);
  }, [availableFields]);

  // Toggle field selection
  const toggleField = useCallback((fieldName: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  }, []);

  // Update field value
  const updateFieldValue = useCallback((fieldName: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  // Get selected fields as an array of field names
  const getSelectedFieldNames = useCallback(() => {
    return Object.entries(selectedFields)
      .filter(([_, isSelected]) => isSelected)
      .map(([fieldName]) => fieldName);
  }, [selectedFields]);

  // Create a payload with only the selected fields and their values
  const createUpdatePayload = useCallback(() => {
    const fieldsToUpdate = getSelectedFieldNames();
    const updateData: Record<string, any> = {};

    fieldsToUpdate.forEach(fieldName => {
      // If a field is undefined or empty string, it means "clear this field"
      updateData[fieldName] = fieldValues[fieldName] === undefined ? null : fieldValues[fieldName];
    });

    return updateData;
  }, [fieldValues, getSelectedFieldNames]);

  // Reset all field selections and values
  const resetFields = useCallback(() => {
    setSelectedFields({});
    setFieldValues({});
  }, []);

  return {
    fieldsByCategory,
    selectedFields,
    fieldValues,
    toggleField,
    updateFieldValue,
    getSelectedFieldNames,
    createUpdatePayload,
    resetFields
  };
};

export default useFieldManagement;