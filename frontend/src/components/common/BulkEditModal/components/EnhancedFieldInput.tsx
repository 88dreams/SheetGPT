import React, { useState, useEffect } from 'react';
import { Select, Input, DatePicker, Spin, Alert, Space, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import { FieldProps } from '../types';
import { entityResolver } from '../../../../utils/entityResolver';
import EntityResolutionBadge from '../../../data/EntityUpdate/EntityResolutionBadge';
import { apiCache } from '../../../../utils/apiCache';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

/**
 * Enhanced input component for fields with entity resolution capabilities
 */
const EnhancedFieldInput: React.FC<FieldProps> = ({
  field,
  selected,
  value,
  relatedEntities,
  onValueChange,
  disabled = false,
  context
}) => {
  const { name, type } = field;
  const [searchValue, setSearchValue] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [resolvedEntity, setResolvedEntity] = useState<any>(null);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [resolutionInfo, setResolutionInfo] = useState<any>(null);

  // Check if this is a foreign key field
  const isForeignKey = name.endsWith('_id');
  
  // Determine entity type from field name (e.g., "league_id" -> "league")
  const entityType = isForeignKey ? name.replace('_id', '') : '';
  
  // Handle context-aware entity types
  const getContextForField = () => {
    if (!context) return {};
    
    const ctx: Record<string, any> = {};
    
    // Handle special context relationships
    if (name === 'division_conference_id' && context.league_id) {
      ctx.league_id = context.league_id;
    }
    
    // Add more context mappings as needed
    
    return ctx;
  };
  
  // Resolve entity when value changes (for ID values)
  useEffect(() => {
    if (!isForeignKey || !value || !entityType || disabled || !selected) return;
    
    const resolveEntity = async () => {
      try {
        // Check if entity exists in related entities first
        const found = relatedEntities?.find((entity: any) => entity.id === value);
        if (found) {
          setResolvedEntity(found);
          setResolutionError(null);
          return;
        }
        
        // Resolve the entity using the entity resolver
        setIsSearching(true);
        setResolutionError(null);
        
        const entity = await entityResolver.resolveEntity(
          entityType,
          value,
          {
            context: getContextForField(),
            allowFuzzy: true,
            minimumMatchScore: 0.6
          }
        );
        
        // Get resolution info from cache if available
        const cacheKey = `resolve_entity_${entityType}_${value}`;
        const cachedResponse = apiCache.get(cacheKey);
        const resInfo = cachedResponse?.resolution_info || {};
        
        if (entity) {
          setResolvedEntity(entity);
          setResolutionInfo(resInfo);
        } else {
          setResolvedEntity(null);
          setResolutionError(`Could not resolve ${entityType} with ID ${value}`);
        }
      } catch (error) {
        console.error(`Error resolving ${entityType}:`, error);
        setResolvedEntity(null);
        setResolutionError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSearching(false);
      }
    };
    
    resolveEntity();
  }, [isForeignKey, value, entityType, disabled, selected, relatedEntities]);

  // Handle search for entity by name
  const handleSearch = async (input: string) => {
    if (!isForeignKey || !input || input.length < 2 || disabled || !selected) return;
    
    setSearchValue(input);
    setIsSearching(true);
    setResolutionError(null);
    
    try {
      const entity = await entityResolver.resolveEntity(
        entityType,
        input,
        {
          context: getContextForField(),
          allowFuzzy: true,
          minimumMatchScore: 0.5
        }
      );
      
      // Get resolution info from cache if available
      const cacheKey = `resolve_entity_${entityType}_${input}`;
      const cachedResponse = apiCache.get(cacheKey);
      const resInfo = cachedResponse?.resolution_info || {};
      
      if (entity) {
        setResolvedEntity(entity);
        setResolutionInfo(resInfo);
        // Update the actual field value with the ID
        onValueChange(name, entity.id);
      } else {
        setResolutionError(`No match found for "${input}"`);
      }
    } catch (error) {
      console.error(`Error searching for ${entityType}:`, error);
      setResolutionError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Clear search and reset entity state
  const handleClear = () => {
    setSearchValue('');
    setResolvedEntity(null);
    setResolutionError(null);
    setResolutionInfo(null);
    onValueChange(name, null);
  };
  
  // Handle selecting from dropdown
  const handleSelect = (selectedValue: string) => {
    // Handle entity selection
    if (isForeignKey) {
      // Find selected entity
      const entity = relatedEntities?.find((entity: any) => entity.id === selectedValue);
      
      if (entity) {
        setResolvedEntity(entity);
        setResolutionError(null);
        setResolutionInfo(null);
        onValueChange(name, entity.id);
      } else {
        onValueChange(name, selectedValue);
      }
    } else {
      // For boolean or enum fields
      onValueChange(name, selectedValue);
    }
  };
  
  // Render foreign key fields with enhanced entity resolution
  if (isForeignKey && relatedEntities?.length > 0) {
    // For division_conference_id, sort by league name and then division name
    let sortedEntities = [...relatedEntities];
    if (name === 'division_conference_id') {
      sortedEntities.sort((a, b) => {
        // First sort by league name
        const leagueA = a.league_name || '';
        const leagueB = b.league_name || '';
        
        if (leagueA !== leagueB) {
          return leagueA.localeCompare(leagueB);
        }
        
        // Then sort by division name
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    // Entity label for display (e.g., "league_id" -> "League")
    const entityLabel = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    
    return (
      <div>
        {/* Dropdown for related entities */}
        <Select
          showSearch
          value={value || undefined}
          placeholder={`Select ${entityLabel}...`}
          style={{ width: '100%' }}
          onChange={handleSelect}
          onSearch={handleSearch}
          loading={isSearching}
          disabled={disabled || !selected}
          filterOption={(input, option) => 
            option?.label?.toString().toLowerCase().includes(input.toLowerCase()) || false
          }
          notFoundContent={isSearching ? <Spin size="small" /> : null}
          allowClear
          onClear={handleClear}
        >
          {sortedEntities.map(entity => (
            <Option 
              key={entity.id} 
              value={entity.id}
              label={name === 'division_conference_id' 
                ? `${entity.name} (${entity.league_name || 'Unknown League'})` 
                : entity.name || entity.id}
            >
              {name === 'division_conference_id' 
                ? `${entity.name} (${entity.league_name || 'Unknown League'})` 
                : entity.name || entity.id}
            </Option>
          ))}
        </Select>
        
        {/* Resolution info and errors */}
        {resolvedEntity && resolutionInfo && (resolutionInfo.fuzzy_matched || resolutionInfo.context_matched) && (
          <div style={{ marginTop: 8 }}>
            <Space align="center">
              <EntityResolutionBadge
                matchScore={resolutionInfo.match_score}
                fuzzyMatched={resolutionInfo.fuzzy_matched}
                contextMatched={resolutionInfo.context_matched}
                virtualEntity={resolutionInfo.virtual_entity}
                size="small"
              />
              <Tooltip title={`Entity was resolved using approximate matching. Please verify this is the correct ${entityType}.`}>
                {/* @ts-expect-error TS2739: AntD icon type issue */}
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
              </Tooltip>
              <Text type="secondary" style={{ fontSize: '0.8rem' }}>
                {resolvedEntity.name || value}
              </Text>
            </Space>
          </div>
        )}
        
        {resolutionError && (
          <Alert
            message={resolutionError}
            type="warning"
            showIcon
            style={{ marginTop: 8, padding: '2px 8px', fontSize: '0.8rem' }}
            {/* @ts-expect-error TS2739: AntD icon type issue */}
            icon={<WarningOutlined />}
          />
        )}
      </div>
    );
  }
  
  // Handle special case for search-only foreign keys (when no relatedEntities provided)
  if (isForeignKey && (!relatedEntities || relatedEntities.length === 0)) {
    return (
      <div>
        <Input
          placeholder={`Search for ${entityType}...`}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={() => handleSearch(searchValue)}
          disabled={disabled || !selected}
          allowClear
          suffix={isSearching ? 
            <Spin size="small" /> :
            // @ts-expect-error TS2739: AntD icon type issue
            <SearchOutlined onClick={() => handleSearch(searchValue)} style={{ cursor: 'pointer' }} />
          }
        />
        
        {resolvedEntity && (
          <div style={{ marginTop: 8 }}>
            <Space align="center">
              {resolutionInfo && (
                <EntityResolutionBadge
                  matchScore={resolutionInfo.match_score}
                  fuzzyMatched={resolutionInfo.fuzzy_matched}
                  contextMatched={resolutionInfo.context_matched}
                  virtualEntity={resolutionInfo.virtual_entity}
                  size="small"
                />
              )}
              <Text>{resolvedEntity.name}</Text>
            </Space>
          </div>
        )}
        
        {resolutionError && (
          <Alert
            message={resolutionError}
            type="warning"
            showIcon
            style={{ marginTop: 8, padding: '2px 8px', fontSize: '0.8rem' }}
          />
        )}
      </div>
    );
  }
  
  // Number fields
  if (type === 'number') {
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value === '' ? '' : Number(e.target.value))}
        disabled={disabled || !selected}
        placeholder={selected ? "Enter value or leave empty to clear" : ""}
      />
    );
  }
  
  // Date fields
  if (type === 'date') {
    return (
      <DatePicker
        value={value ? dayjs(value) : null}
        onChange={(date) => onValueChange(name, date ? date.format('YYYY-MM-DD') : null)}
        disabled={disabled || !selected}
        style={{ width: '100%' }}
        allowClear
      />
    );
  }
  
  // Boolean fields
  if (type === 'boolean') {
    return (
      <Select
        value={value?.toString()}
        onChange={(val) => onValueChange(name, val === 'true' ? true : val === 'false' ? false : null)}
        disabled={disabled || !selected}
        style={{ width: '100%' }}
        allowClear
      >
        <Option value="true">Yes</Option>
        <Option value="false">No</Option>
      </Select>
    );
  }
  
  // Special handling for nickname field
  if (name === 'nickname') {
    return (
      <Input
        value={value || ''}
        onChange={(e) => onValueChange(name, e.target.value)}
        disabled={disabled || !selected}
        placeholder={selected ? "Enter nickname (e.g., NFL, NBA)" : ""}
        maxLength={20}
        showCount
      />
    );
  }
  
  // Default to text input
  return (
    <Input
      value={value || ''}
      onChange={(e) => onValueChange(name, e.target.value)}
      disabled={disabled || !selected}
      placeholder={selected ? "Enter value or leave empty to clear" : ""}
      allowClear
    />
  );
};

export default EnhancedFieldInput;