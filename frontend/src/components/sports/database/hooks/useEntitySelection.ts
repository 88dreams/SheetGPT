import { useState, useCallback, useEffect } from 'react';

export function useEntitySelection(entities: Record<string, unknown>[]) {
  const [selectedEntities, setSelectedEntities] = useState<Record<string, boolean>>({});

  // Reset selections when entities change
  useEffect(() => {
    setSelectedEntities({});
  }, [entities]);

  // Toggle selection of a single entity
  const toggleEntitySelection = useCallback((entityId: string) => {
    setSelectedEntities(prev => ({
      ...prev,
      [entityId]: !prev[entityId]
    }));
  }, []);

  // Select all currently visible entities
  const selectAllEntities = useCallback(() => {
    const newSelection: Record<string, boolean> = {};
    if (Array.isArray(entities)) {
      entities.forEach((entity: any) => {
        if (entity.id) {
          newSelection[entity.id] = true;
        }
      });
    }
    setSelectedEntities(newSelection);
  }, [entities]);

  // Deselect all entities
  const deselectAllEntities = useCallback(() => {
    setSelectedEntities({});
  }, []);

  // Get count of selected entities
  const getSelectedEntityCount = useCallback(() => {
    return Object.values(selectedEntities).filter(Boolean).length;
  }, [selectedEntities]);

  // Get IDs of selected entities
  const getSelectedEntityIds = useCallback(() => {
    return Object.entries(selectedEntities)
      .filter(([_, isSelected]) => isSelected)
      .map(([id, _]) => id);
  }, [selectedEntities]);

  return {
    selectedEntities,
    toggleEntitySelection,
    selectAllEntities,
    deselectAllEntities,
    getSelectedEntityCount,
    getSelectedEntityIds
  };
}