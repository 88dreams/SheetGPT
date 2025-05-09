import React, { useState, useEffect } from 'react';
import { Form, Select, Space, Typography, Tooltip, Spin, Alert } from 'antd';
import { EditOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../../types/sports';
import { useEntityResolution } from '../../../../hooks/useEntityResolution';
import EntityResolutionBadge from '../EntityResolutionBadge';
import { entityResolver, EntityResolver } from '../../../../utils/entityResolver';

const { Text } = Typography;
const { Option } = Select;

interface EntitySelectFieldProps {
  field: string;
  label: string;
  value: string | null;
  entityType: EntityType;
  onChange: (field: string, value: string) => void;
  isEditing: boolean;
  isRequired?: boolean;
  options?: Entity[];
  placeholder?: string;
  helpText?: string;
  contextField?: string;
  contextValue?: string;
  showResolutionInfo?: boolean;
  showEmptyOption?: boolean;
  emptyLabel?: string;
  searchMode?: 'simple' | 'enhanced';
}

/**
 * A reusable form field component for selecting entities with resolution feedback
 */
const EntitySelectField: React.FC<EntitySelectFieldProps> = ({
  field,
  label,
  value,
  entityType,
  onChange,
  isEditing,
  isRequired = false,
  options = [],
  placeholder,
  helpText,
  contextField,
  contextValue,
  showResolutionInfo = true,
  showEmptyOption = false,
  emptyLabel = 'None',
  searchMode = 'enhanced'
}) => {
  const [selectedOption, setSelectedOption] = useState<Entity | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Entity[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Context object for entity resolution
  const context = contextField && contextValue 
    ? { [contextField]: contextValue } 
    : {};

  // If we have a value but no selected option, try to find it in options
  useEffect(() => {
    if (value && !selectedOption) {
      const found = options.find(option => option.id === value);
      if (found) {
        setSelectedOption(found);
      }
    }
  }, [value, options, selectedOption]);

  // Resolve entity from value if not found in options
  useEffect(() => {
    if (value && !selectedOption && options.every(option => option.id !== value)) {
      const resolveEntity = async () => {
        try {
          const entity = await entityResolver.resolveEntity(entityType, value);
          if (entity) {
            setSelectedOption(entity as Entity);
          }
        } catch (error) {
          console.error(`Error resolving ${entityType} with ID ${value}:`, error);
        }
      };
      resolveEntity();
    }
  }, [value, entityType, selectedOption, options]);

  // Handle search text changes
  const handleSearch = async (text: string) => {
    if (!text || text.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchText(text);
    
    if (searchMode === 'simple') {
      // Simple filtering of provided options
      const filtered = options.filter(option => 
        option.name?.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered);
      return;
    }

    // Enhanced search with entity resolver
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const entity = await entityResolver.resolveEntity(
        entityType,
        text,
        {
          context,
          allowFuzzy: true,
          minimumMatchScore: 0.4,
          throwOnError: false
        }
      );
      
      if (entity) {
        setSearchResults([entity as Entity]);
      } else {
        // If no exact match, try to find similar options
        const filtered = options.filter(option => 
          option.name?.toLowerCase().includes(text.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error(`Error searching for ${entityType}:`, error);
      setSearchError(`Error searching for ${entityType}: ${error.message}`);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle selection of an option
  const handleSelect = (selectedValue: string) => {
    const selected = options.find(option => option.id === selectedValue) || 
                    searchResults.find(option => option.id === selectedValue);
    
    if (selected) {
      setSelectedOption(selected);
      onChange(field, selected.id);
    } else {
      setSelectedOption(null);
      onChange(field, selectedValue);
    }
    
    setSearchText('');
    setSearchResults([]);
  };

  // Update display value when options or value changes
  const displayValue = selectedOption?.name || value || undefined;
  
  // Get resolution info for the selected entity
  const getEntityValue = () => {
    if (!selectedOption) return null;
    
    // Create the display element with resolution badge if available
    if (showResolutionInfo) {
      // Check if we have resolution info in the entity (using optional chaining)
      const entityWithInfo = selectedOption as any;
      const resolutionInfo = entityWithInfo?.resolution_info || {};
      
      return (
        <Space>
          <span>{selectedOption.name}</span>
          {(resolutionInfo.fuzzyMatched || resolutionInfo.contextMatched || resolutionInfo.virtualEntity) && (
            <EntityResolutionBadge
              matchScore={resolutionInfo.match_score}
              fuzzyMatched={resolutionInfo.fuzzy_matched}
              contextMatched={resolutionInfo.context_matched}
              virtualEntity={resolutionInfo.virtual_entity}
              size="small"
            />
          )}
        </Space>
      );
    }
    
    return selectedOption.name;
  };

  return (
    <Form.Item
      label={
        <Space>
          <Text>{label}</Text>
          {isRequired ? <Text type="danger">*</Text> : null}
          {isEditing ? <EditOutlined /> : <LockOutlined />}
          {helpText && (
            <Tooltip title={helpText}>
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          )}
        </Space>
      }
      required={isRequired}
      help={searchError}
      validateStatus={searchError ? 'error' : undefined}
    >
      {isEditing ? (
        <Select
          showSearch
          value={value || undefined}
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
          style={{ width: '100%' }}
          defaultActiveFirstOption={false}
          showArrow={true}
          filterOption={false}
          onSearch={handleSearch}
          onChange={handleSelect}
          notFoundContent={isSearching ? <Spin size="small" /> : null}
          loading={isSearching}
          optionLabelProp="label"
        >
          {/* Empty option if needed */}
          {showEmptyOption && (
            <Option key="empty" value="">
              {emptyLabel}
            </Option>
          )}
          
          {/* Original options */}
          {options.map((option) => {
            const optionWithInfo = option as any;
            const resolutionInfo = optionWithInfo?.resolution_info || {};
            return (
              <Option key={option.id} value={option.id} label={option.name}>
                <Space>
                  <span>{option.name}</span>
                  {showResolutionInfo && resolutionInfo && (
                    <EntityResolutionBadge
                      matchScore={resolutionInfo.match_score}
                      fuzzyMatched={resolutionInfo.fuzzy_matched}
                      contextMatched={resolutionInfo.context_matched}
                      virtualEntity={resolutionInfo.virtual_entity}
                      size="small"
                    />
                  )}
                </Space>
              </Option>
            );
          })}
          
          {/* Search results that aren't in original options */}
          {searchResults
            .filter(result => !options.some(option => option.id === result.id))
            .map((result) => {
              const resultWithInfo = result as any;
              const resolutionInfo = resultWithInfo?.resolution_info || {};
              return (
                <Option key={result.id} value={result.id} label={result.name}>
                  <Space>
                    <span>{result.name}</span>
                    {showResolutionInfo && resolutionInfo && (
                      <EntityResolutionBadge
                        matchScore={resolutionInfo.match_score}
                        fuzzyMatched={resolutionInfo.fuzzy_matched}
                        contextMatched={resolutionInfo.context_matched}
                        virtualEntity={resolutionInfo.virtual_entity}
                        size="small"
                      />
                    )}
                  </Space>
                </Option>
              );
            })}
        </Select>
      ) : (
        // Display mode
        <div style={{ padding: '4px 0' }}>
          {selectedOption ? (
            getEntityValue()
          ) : (
            <Text type="secondary">{value || 'None'}</Text>
          )}
        </div>
      )}
    </Form.Item>
  );
};

export default EntitySelectField;