import { useState, useCallback } from 'react';
import { EntityType } from '../../../../../types/sports';

interface UseInlineEditProps {
  selectedEntityType: EntityType;
  handleUpdateEntity: (id: string, updates: Record<string, unknown>) => Promise<void>;
}

/**
 * Custom hook for inline editing of entity fields
 */
export function useInlineEdit({ selectedEntityType, handleUpdateEntity }: UseInlineEditProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingNicknameId, setEditingNicknameId] = useState<string | null>(null);
  const [nicknameEditValue, setNicknameEditValue] = useState('');

  /**
   * Start editing entity name
   */
  const startEdit = useCallback((entity: any) => {
    setEditingId(entity.id);
    
    // For broadcast rights entities, only use the broadcast company name part
    if (selectedEntityType === 'broadcast_rights' && typeof entity.name === 'string' && entity.name.includes(' - ')) {
      setEditValue(entity.name.split(' - ')[0]);
    } else {
      setEditValue(entity.name);
    }
  }, [selectedEntityType]);

  /**
   * Cancel name editing
   */
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  /**
   * Save name edit
   */
  const saveEdit = useCallback(async (id: string) => {
    if (editValue.trim()) {
      try {
        if (selectedEntityType === 'broadcast_rights') {
          // For broadcast rights, try to preserve the territory part
          const entities = document.querySelectorAll(`tr[data-entity-id="${id}"]`);
          if (entities.length > 0) {
            const entity = entities[0];
            const nameCell = entity.querySelector('[data-field="name"]');
            if (nameCell && nameCell.textContent && nameCell.textContent.includes(' - ')) {
              // Keep the territory part when updating
              const territory = nameCell.textContent.split(' - ')[1];
              await handleUpdateEntity(id, { name: `${editValue.trim()} - ${territory}` });
            } else {
              await handleUpdateEntity(id, { name: editValue.trim() });
            }
          } else {
            await handleUpdateEntity(id, { name: editValue.trim() });
          }
        } else {
          // Normal case for other entity types
          await handleUpdateEntity(id, { name: editValue.trim() });
        }
        
        setEditingId(null);
        setEditValue('');
      } catch (error) {
        console.error('Error saving edit:', error);
      }
    }
  }, [editValue, selectedEntityType, handleUpdateEntity]);

  /**
   * Handle keyboard events for name editing
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  /**
   * Start nickname editing
   */
  const startNicknameEdit = useCallback((entity: any) => {
    setEditingNicknameId(entity.id);
    setNicknameEditValue(entity.nickname || '');
  }, []);

  /**
   * Cancel nickname editing
   */
  const cancelNicknameEdit = useCallback(() => {
    setEditingNicknameId(null);
    setNicknameEditValue('');
  }, []);

  /**
   * Save nickname edit
   */
  const saveNicknameEdit = useCallback(async (id: string) => {
    if (selectedEntityType === 'league' || selectedEntityType === 'division_conference') {
      try {
        await handleUpdateEntity(id, { nickname: nicknameEditValue.trim() });
        setEditingNicknameId(null);
        setNicknameEditValue('');
      } catch (error) {
        console.error('Error saving nickname edit:', error);
      }
    }
  }, [nicknameEditValue, selectedEntityType, handleUpdateEntity]);

  /**
   * Handle keyboard events for nickname editing
   */
  const handleNicknameKeyDown = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveNicknameEdit(id);
    } else if (e.key === 'Escape') {
      cancelNicknameEdit();
    }
  }, [saveNicknameEdit, cancelNicknameEdit]);

  return {
    editingId,
    editValue,
    setEditValue,
    editingNicknameId,
    nicknameEditValue,
    setNicknameEditValue,
    startEdit,
    cancelEdit,
    saveEdit,
    handleKeyDown,
    startNicknameEdit,
    cancelNicknameEdit,
    saveNicknameEdit,
    handleNicknameKeyDown
  };
}