import React, { useState, useCallback, useMemo } from 'react';
import { Input, AutoComplete } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';

interface SmartEntitySearchProps {
  onEntitySelect: (entity: Entity) => void;
  entityTypes: EntityType[];
  placeholder?: string;
  entities?: Entity[];
}

interface AutoCompleteOption {
  key: string;
  value: string;
  label: string;
  entity: Entity;
}

/**
 * SmartEntitySearch component that provides an autocomplete search box for entities.
 * This implementation uses memoization and stable callback references to prevent infinite loops.
 */
export const SmartEntitySearch: React.FC<SmartEntitySearchProps> = React.memo(({
  onEntitySelect,
  entityTypes,
  placeholder = "Search for Stadium, League, or Team...",
  entities = []
}) => {
  const [searchText, setSearchText] = useState('');

  // Memoize options to prevent unnecessary recalculations
  const options = useMemo(() => {
    if (!searchText) return [];
    
    const searchLower = searchText.toLowerCase();
    if (!Array.isArray(entities)) return [];
    
    return entities
      .filter(entity => entity?.name?.toLowerCase?.().includes(searchLower))
      .map(entity => ({
        key: entity?.id || '',
        value: entity?.name || '',
        label: entity?.name || '',
        entity
      }));
  }, [searchText, entities]);

  // Use a stable callback for handleSearch
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  // Use a stable callback for handleSelect
  const handleSelect = useCallback((_, option: any) => {
    if (option && option.entity) {
      onEntitySelect(option.entity);
      setSearchText('');
    }
  }, [onEntitySelect]);

  // Create a stable key for the AutoComplete component based on entity type
  const searchKey = useMemo(() => 
    `search-${entityTypes.join('-')}-${entities.length}`,
  [entityTypes, entities.length]);

  return (
    <AutoComplete
      key={searchKey}
      style={{ width: '100%' }}
      options={options}
      onSelect={handleSelect}
      onSearch={handleSearch}
      placeholder={placeholder}
      value={searchText}
      filterOption={false} // Disable built-in filtering to prevent Ant filtering twice
      notFoundContent={searchText ? "No matches found" : "Type to search"}
    >
      <Input
        size="middle"
        prefix={<SearchOutlined />}
        style={{ width: '100%' }}
      />
    </AutoComplete>
  );
});

// Add display name for easier debugging
SmartEntitySearch.displayName = 'SmartEntitySearch';

export default SmartEntitySearch; 