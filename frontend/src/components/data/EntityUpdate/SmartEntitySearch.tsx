import React, { useState, useEffect, useMemo } from 'react';
import { Input, AutoComplete, Tag, Space, Tooltip } from 'antd';
import { SearchOutlined, QuestionCircleOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';
import { entityResolver } from '../../../utils/entityResolver';
import { apiCache } from '../../../utils/apiCache';
import { createMemoEqualityFn } from '../../../utils/fingerprint';

interface SmartEntitySearchProps {
  onEntitySelect: (entity: Entity) => void;
  entityTypes: EntityType[];
  placeholder?: string;
  context?: Record<string, any>;
  minimumMatchScore?: number;
  showMatchDetails?: boolean;
}

/**
 * Enhanced SmartEntitySearch using the entity resolver for improved matching
 */
const SmartEntitySearch = ({
  onEntitySelect,
  entityTypes,
  placeholder = "Search for entity...",
  context,
  minimumMatchScore = 0.6,
  showMatchDetails = true
}: SmartEntitySearchProps) => {
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Array<{
    entity: Entity;
    entityType: string;
    matchScore?: number;
    fuzzyMatched?: boolean;
    contextMatched?: boolean;
    virtualEntity?: boolean;
  }>>([]);

  // Memoize the context to avoid creating new equality function on each render
  const memoizedContext = useMemo(() => 
    context ? createMemoEqualityFn(context) : null, 
    [context]
  );

  // Debounce the search to avoid API spam
  useEffect(() => {
    if (!searchText || searchText.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (!searchText) return;
      
      setIsLoading(true);
      
      try {
        // Search for entities using the resolver with all provided entity types
        const searchPromises = entityTypes.map(async (type) => {
          try {
            const response = await entityResolver.resolveEntity(
              type,
              searchText,
              {
                context,
                allowFuzzy: true,
                minimumMatchScore,
                throwOnError: false
              }
            );
            
            if (!response) return null;
            
            // Get the resolution info from cache if available
            const cacheKey = `resolve_entity_${type}_${searchText}`;
            const cachedResponse = apiCache.get(cacheKey);
            const resolutionInfo = cachedResponse?.resolution_info || {};
            
            return {
              entity: response,
              entityType: type,
              matchScore: resolutionInfo.match_score,
              fuzzyMatched: resolutionInfo.fuzzy_matched,
              contextMatched: resolutionInfo.context_matched,
              virtualEntity: resolutionInfo.virtual_entity
            };
          } catch (error) {
            console.error(`Error resolving ${type}:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(searchPromises);
        const validResults = results.filter(Boolean);
        
        // Sort by match score (if available) or alphabetically by name
        validResults.sort((a, b) => {
          if (a.matchScore && b.matchScore) {
            return b.matchScore - a.matchScore;
          }
          return (a.entity.name || '').localeCompare(b.entity.name || '');
        });
        
        setResults(validResults);
      } catch (error) {
        console.error('Error searching entities:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timer);
  }, [searchText, entityTypes, minimumMatchScore, memoizedContext]);

  const handleSearch = (text: string) => {
    setSearchText(text);
  };

  const handleSelect = (value: string, option: any) => {
    if (option?.entity) {
      onEntitySelect(option.entity);
      setSearchText('');
      setResults([]);
    }
  };

  // Generate AutoComplete options with match information
  const options = useMemo(() => {
    return results.map(result => {
      // Create match information label
      let matchInfo = null;
      if (showMatchDetails) {
        if (result.fuzzyMatched && result.matchScore) {
          // Show match score as percentage
          const scorePercent = Math.round(result.matchScore * 100);
          const scoreColor = 
            scorePercent >= 90 ? 'green' :
            scorePercent >= 75 ? 'blue' :
            scorePercent >= 60 ? 'orange' : 'red';
            
          matchInfo = (
            <Tooltip title={`${scorePercent}% match confidence`}>
              <Tag color={scoreColor}>{scorePercent}%</Tag>
            </Tooltip>
          );
        } else if (result.contextMatched) {
          matchInfo = <Tag color="purple">Context Match</Tag>;
        } else if (result.virtualEntity) {
          matchInfo = <Tag color="cyan">Virtual Entity</Tag>;
        } else {
          matchInfo = <Tag color="green"><CheckCircleFilled /> Exact</Tag>;
        }
      }
      
      // Build the option label with entity type and match info
      const label = (
        <Space>
          <span>
            {result.entity.name}
          </span>
          <Tag color="blue">{result.entityType}</Tag>
          {matchInfo}
        </Space>
      );
      
      return {
        key: result.entity.id || `${result.entityType}_${Math.random()}`,
        value: result.entity.name || '',
        label,
        entity: result.entity
      };
    });
  }, [results, showMatchDetails]);

  return (
    <AutoComplete
      style={{ width: '100%' }}
      options={options}
      onSelect={handleSelect}
      onSearch={handleSearch}
      placeholder={placeholder}
      value={searchText}
      filterOption={false}
      notFoundContent={isLoading ? "Searching..." : "No entities found"}
    >
      <Input
        size="middle"
        prefix={<SearchOutlined />}
        suffix={
          <Tooltip title="Search for entities by name. Results show match confidence.">
            <QuestionCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
          </Tooltip>
        }
        style={{ width: '100%' }}
        loading={isLoading}
      />
    </AutoComplete>
  );
};

export default SmartEntitySearch;