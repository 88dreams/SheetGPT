import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
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

// Use memo to prevent unnecessary re-renders of the entire component
const SmartEntitySearch: React.FC<SmartEntitySearchProps> = memo(({
  onEntitySelect,
  entityTypes,
  placeholder = "Search for Stadium, League, or Team...",
  entities = []
}) => {
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState<AutoCompleteOption[]>([]);

  // Get a stable identifier for the current entity list
  const entitiesStableId = useMemo(() => {
    if (entities.length === 0) return '';
    return `${entityTypes.join('-')}-${entities.length}`;
  }, [entityTypes, entities.length]);

  // Reset search state when entities change
  useEffect(() => {
    setSearchText('');
    setOptions([]);
  }, [entitiesStableId]);

  // Use useCallback to prevent handleSearch from being recreated on every render
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (!text) {
      setOptions([]);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = entities
      .filter(entity => entity.name.toLowerCase().includes(searchLower))
      .map(entity => ({
        key: entity.id,
        value: entity.name,
        label: entity.name,
        entity: entity
      }));

    setOptions(filtered);
  }, [entities]);

  // Use useCallback to prevent handleSelect from being recreated on every render
  const handleSelect = useCallback((_: string, option: AutoCompleteOption) => {
    onEntitySelect(option.entity);
    setSearchText('');
    setOptions([]);
  }, [onEntitySelect]);

  return (
    <AutoComplete
      style={{ width: '100%' }}
      options={options}
      onSelect={handleSelect}
      onSearch={handleSearch}
      placeholder={placeholder}
      value={searchText}
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

// Export both named and default exports for compatibility
export { SmartEntitySearch };

export default SmartEntitySearch; 