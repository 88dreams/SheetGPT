import { useState, useEffect, useMemo } from 'react';
import { EntityType } from '../../../../../types/sports';

interface ColumnConfigItem {
  key: string;
  label: string;
  type: string;
  // Add other properties if they exist on the items in generatedColumnsArray
}

/**
 * Hook for managing column visibility
 */
export function useColumnVisibility(entityType: EntityType, columnsConfigArray: ColumnConfigItem[]) {
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<{[key: string]: boolean}>({});
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [showFullUuids, setShowFullUuids] = useState<boolean>(false);

  // Memoize availableFields to prevent re-calculation if columnsConfigArray reference doesn't change unnecessarily
  const availableFields = useMemo(() => {
    if (!Array.isArray(columnsConfigArray) || columnsConfigArray.length === 0) return [];
    return columnsConfigArray.map(col => col.key);
  }, [columnsConfigArray]);

  // Generate initial column order based on entity data
  const getInitialVisibility = () => {
    if (availableFields.length === 0) return {};
    
    let newVisibility: {[key: string]: boolean} = {};
    availableFields.forEach(fieldKey => {
      const columnConfig = columnsConfigArray.find(c => c.key === fieldKey);
      // Check if this is a UUID field that doesn't have a corresponding _name field
      // For simplicity, we assume column type or specific naming conventions in `fieldKey` might indicate UUIDs.
      // The original logic was: availableFields.includes(field.replace('_id', '_name'));
      // This needs careful thought if we don't have the full entity data here anymore to check for _name pairs.
      // A simpler heuristic: hide by default if it ends with _id AND is not 'id' itself, or is 'id'.
      // Or, rely on a type property if available in ColumnConfigItem e.g. columnConfig?.type === 'uuid'
      const isLikelyIdField = fieldKey === 'id' || (fieldKey.endsWith('_id')); 
      // Default to visible, but hide likely ID fields. User can override.
      // This is a common default. The original logic tried to be smarter about _name fields.
      newVisibility[fieldKey] = !isLikelyIdField; 
    });
    return newVisibility;
  };

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!entityType || availableFields.length === 0) {
      // If no entity type or no fields from columnsConfigArray, don't proceed or clear visibility
      // setVisibleColumns({}); // Optionally clear if desired when no columns
      return;
    }
    
    const storageKey = `entityList_${entityType}_columns`;
    let savedVisibility = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    
    let newVisibility: {[key: string]: boolean} = {};
    
    if (savedVisibility) {
      try {
        const parsedVisibility = JSON.parse(savedVisibility);
        newVisibility = { ...parsedVisibility };
        
        availableFields.forEach(fieldKey => {
          if (newVisibility[fieldKey] === undefined) {
            const columnConfig = columnsConfigArray.find(c => c.key === fieldKey);
            const isLikelyIdField = fieldKey === 'id' || (fieldKey.endsWith('_id'));
            newVisibility[fieldKey] = !isLikelyIdField;
          }
        });
      } catch (e) {
        console.error('Error parsing saved column visibility:', e);
        newVisibility = getInitialVisibility();
      }
    } else {
      newVisibility = getInitialVisibility();
    }
    
    // Special handling for entity visibility but respect user preferences
    // This part seems to rely on availableFields from the data, not just column config keys.
    // It might need adjustment if it's trying to show/hide columns not in columnsConfigArray.
    // For now, assuming the fields mentioned will be in columnsConfigArray if relevant.
    if (entityType === 'broadcast' || entityType === 'production') {
      if ('name' in newVisibility) {
        // Only delete if it was truly based on a direct column 'name'.
        // If 'name' is not a key from columnsConfigArray, this won't do anything, which is fine.
        delete newVisibility['name']; 
      }
      
      if (Object.keys(newVisibility).length === 0 || !savedVisibility) { // Apply defaults if empty or no saved state
        const defaultVisibleForType: string[] = [];
        if (entityType === 'broadcast') {
          defaultVisibleForType.push('broadcast_company_name', 'territory', 'league_name', 'entity_name', 'entity_type');
        } else if (entityType === 'production') {
          defaultVisibleForType.push('production_company_name', 'entity_name', 'entity_type', 'service_type');
        }
        defaultVisibleForType.forEach(fieldKey => {
          if (availableFields.includes(fieldKey)) { // Check against fields derived from columnsConfigArray
            newVisibility[fieldKey] = true;
          }
        });
      }
    }
    setVisibleColumns(newVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, columnsConfigArray, availableFields]); // availableFields is memoized

  // Save column visibility to both localStorage and sessionStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0 && entityType) {
      const storageKey = `entityList_${entityType}_columns`;
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      sessionStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, entityType]);

  // Toggle visibility of all columns
  const showAllColumns = () => {
    if (availableFields.length === 0) return;
    const allVisible = availableFields.reduce((acc, fieldKey) => {
      acc[fieldKey] = true;
      return acc;
    }, {} as {[key: string]: boolean});
    setVisibleColumns(allVisible);
  };

  // Toggle a single column's visibility
  const toggleColumnVisibility = (fieldKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  return {
    visibleColumns,
    setVisibleColumns,
    showColumnSelector,
    setShowColumnSelector,
    showFullUuids,
    setShowFullUuids,
    toggleColumnVisibility,
    showAllColumns
  };
}