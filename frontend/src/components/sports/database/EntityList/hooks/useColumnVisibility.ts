import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // Derive availableFields from columnsConfigArray.key, memoized
  const availableFields = useMemo(() => {
    if (!Array.isArray(columnsConfigArray) || columnsConfigArray.length === 0) return [];
    return columnsConfigArray.map(colConfig => colConfig.key);
  }, [columnsConfigArray]);

  // Generate initial column visibility based on availableFields derived from columnsConfigArray
  const getInitialVisibility = useCallback(() => {
    if (availableFields.length === 0) return {};
    
    let newVisibility: {[key: string]: boolean} = {};
    const fieldsToHideByDefault = ['id', 'created_at', 'updated_at', 'deleted_at']; // Add our target fields

    availableFields.forEach(fieldKey => {
      const isLikelyIdField = fieldKey.endsWith('_id'); // Keep this for other _id fields
      
      if (fieldsToHideByDefault.includes(fieldKey) || isLikelyIdField) {
        newVisibility[fieldKey] = false;
      } else {
        newVisibility[fieldKey] = true;
      }
    });
    return newVisibility;
  }, [availableFields]);

  /**
   * Initialize columns based on entity data when entity type or data changes
   */
  useEffect(() => {
    if (!entityType || availableFields.length === 0) {
      return;
    }
    
    const storageKey = `entityList_${entityType}_columns`;
    const savedVisibilityJson = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    
    let activeVisibilityState: {[key: string]: boolean} = {}; // Use a working variable
    const initialDefaults = getInitialVisibility();
    const fieldsToForceHide = ['created_at', 'updated_at', 'deleted_at'];

    let usingSavedState = false;
    if (savedVisibilityJson) {
      try {
        const parsedSavedVisibility = JSON.parse(savedVisibilityJson);
        if (Object.keys(parsedSavedVisibility).length > 0) { // Check if saved state is not empty
            activeVisibilityState = { ...initialDefaults }; // Start with initial defaults
            // Override with saved user preferences, EXCEPT for fields we want to force hide
            for (const fieldKey in parsedSavedVisibility) {
              if (availableFields.includes(fieldKey) && !fieldsToForceHide.includes(fieldKey)) {
                activeVisibilityState[fieldKey] = parsedSavedVisibility[fieldKey];
              }
            }
            // Ensure forced hidden fields are indeed false, even if storage had them true
            fieldsToForceHide.forEach(fieldToHide => {
                if (availableFields.includes(fieldToHide)) {
                    activeVisibilityState[fieldToHide] = false;
                }
            });
            usingSavedState = true;
            console.log(`[useColumnVisibility] EntityType: ${entityType} - Loaded and merged from SAVED state.`);
        }
      } catch (e) {
        console.error('Error parsing saved column visibility, falling back to defaults:', e);
        // Fall through to use initial defaults if parsing failed
      }
    }

    if (!usingSavedState) { // No valid saved state, or it was empty
      console.log(`[useColumnVisibility] EntityType: ${entityType} - Using DEFAULT state logic.`);
      activeVisibilityState = { ...initialDefaults }; // Start with general defaults, then override if specific entity type matches

      let entitySpecificDefaultsApplied = false;
      if (entityType === 'broadcast') {
        const broadcastVisibleByDefault = ['broadcast_company_name', 'entity_name', 'league_name', 'league_sport', 'territory', 'start_date', 'end_date'];
        availableFields.forEach(fieldKey => {
          activeVisibilityState[fieldKey] = broadcastVisibleByDefault.includes(fieldKey);
        });
        entitySpecificDefaultsApplied = true;
      } else if (entityType === 'production_service') { 
        const productionVisibleByDefault = ['production_company_name', 'service_type', 'league_name', 'entity_name', 'secondary_brand_name', 'start_date', 'end_date'];
        availableFields.forEach(fieldKey => {
          activeVisibilityState[fieldKey] = productionVisibleByDefault.includes(fieldKey);
        });
        entitySpecificDefaultsApplied = true;
      } else if (entityType === 'team') {
        const teamVisibleByDefault = [ 'name', 'league_sport', 'league_name', 'division_conference_name', 'stadium_name', 'city', 'state', 'founded_year'];
        availableFields.forEach(fieldKey => {
          activeVisibilityState[fieldKey] = teamVisibleByDefault.includes(fieldKey);
        });
        entitySpecificDefaultsApplied = true;
      } else if (entityType === 'brand') {
        const brandVisibleByDefault = ['name', 'company_type', 'partner', 'partner_relationship', 'country'];
        availableFields.forEach(fieldKey => {
          activeVisibilityState[fieldKey] = brandVisibleByDefault.includes(fieldKey);
        });
        entitySpecificDefaultsApplied = true;
      }
      
      if (entitySpecificDefaultsApplied) {
        console.log(`[useColumnVisibility] EntityType: ${entityType} - Applied SPECIFIC defaults over general initialDefaults.`);
      } else {
        // If no specific overrides, activeVisibilityState remains as initialDefaults
        console.log(`[useColumnVisibility] EntityType: ${entityType} - No specific defaults, using general initialDefaults directly.`);
      }
    }
    
    // Final console logs before setting state
    console.log(`[useColumnVisibility] EntityType: ${entityType}`);
    console.log('[useColumnVisibility] Available Fields:', JSON.stringify(availableFields));
    console.log('[useColumnVisibility] Initial Defaults (from getInitialVisibility):', JSON.stringify(initialDefaults));
    if (savedVisibilityJson) {
        try {
            console.log('[useColumnVisibility] Parsed Saved Visibility (if used):', JSON.stringify(JSON.parse(savedVisibilityJson)));
        } catch { /* ignore parse error for logging */ }
    } else {
        console.log('[useColumnVisibility] No Saved Visibility JSON found.');
    }
    console.log('[useColumnVisibility] Final Visibility State being set:', JSON.stringify(activeVisibilityState));

    setVisibleColumns(activeVisibilityState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, columnsConfigArray, availableFields]); // getInitialVisibility removed from deps, availableFields covers its own dependency columnsConfigArray

  // Save column visibility to both localStorage and sessionStorage
  useEffect(() => {
    if (Object.keys(visibleColumns).length > 0 && entityType) {
      const storageKey = `entityList_${entityType}_columns`;
      localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
      sessionStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, entityType]);

  // Toggle visibility of all columns
  const showAllColumns = useCallback(() => {
    if (availableFields.length === 0) return;
    const allVisible = availableFields.reduce((acc, fieldKey) => {
      acc[fieldKey] = true;
      return acc;
    }, {} as {[key: string]: boolean});
    setVisibleColumns(allVisible);
  }, [availableFields]);

  // Toggle a single column's visibility
  const toggleColumnVisibility = useCallback((fieldKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  }, []);

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