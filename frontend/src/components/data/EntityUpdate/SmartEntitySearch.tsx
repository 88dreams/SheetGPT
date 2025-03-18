import React, { useState } from 'react';
import { Input, AutoComplete } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';

interface SmartEntitySearchProps {
  onEntitySelect: (entity: Entity) => void;
  entityTypes: EntityType[];
  placeholder?: string;
  entities?: Entity[];
}

/**
 * Basic implementation of SmartEntitySearch without any complex dependencies
 */
const SmartEntitySearch = ({
  onEntitySelect,
  entityTypes,
  placeholder = "Search for entity...",
  entities = []
}: SmartEntitySearchProps) => {
  const [searchText, setSearchText] = useState('');
  
  // Simplified handling with no memorization or complex logic
  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const handleSelect = (value: string, option: any) => {
    if (option?.entity) {
      onEntitySelect(option.entity);
      setSearchText('');
    }
  };

  // Create options directly in the render method - no dependencies or memoization
  const options = !searchText 
    ? [] 
    : entities
        .filter(entity => {
          if (!entity?.name) return false;
          return entity.name.toLowerCase().includes(searchText.toLowerCase());
        })
        .slice(0, 20)
        .map(entity => ({
          key: entity.id || Math.random().toString(),
          value: entity.name || '',
          label: entity.name || '',
          entity
        }));

  return (
    <AutoComplete
      style={{ width: '100%' }}
      options={options}
      onSelect={handleSelect}
      onSearch={handleSearch}
      placeholder={placeholder}
      value={searchText}
      filterOption={false}
    >
      <Input
        size="middle"
        prefix={<SearchOutlined />}
        style={{ width: '100%' }}
      />
    </AutoComplete>
  );
};

export default SmartEntitySearch;