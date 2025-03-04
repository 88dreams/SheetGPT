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

interface AutoCompleteOption {
  key: string;
  value: string;
  label: string;
  entity: Entity;
}

export const SmartEntitySearch: React.FC<SmartEntitySearchProps> = ({
  onEntitySelect,
  entityTypes,
  placeholder = "Search for Stadium, League, or Team...",
  entities = []
}) => {
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState<AutoCompleteOption[]>([]);

  const handleSearch = (searchText: string) => {
    setSearchText(searchText);
    if (!searchText) {
      setOptions([]);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = entities
      .filter(entity => entity.name.toLowerCase().includes(searchLower))
      .map(entity => ({
        key: entity.id,
        value: entity.name,
        label: entity.name,
        entity: entity
      }));

    setOptions(filtered);
  };

  const handleSelect = (_: string, option: AutoCompleteOption) => {
    onEntitySelect(option.entity);
    setSearchText('');
    setOptions([]);
  };

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
};

export default SmartEntitySearch; 