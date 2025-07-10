import React, { useState, useEffect } from 'react';
import { Card, Space, Typography, Alert, Spin, Empty, Result, Button, Divider } from 'antd';
import { SearchOutlined, ToolOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';
import SmartEntitySearch from './SmartEntitySearch';
import EntityCard from './EntityCard';
import ResolutionSuggestion from './ResolutionSuggestion';
import { entityResolver } from '../../../utils/entityResolver';

const { Title, Text } = Typography;

const SUPPORTED_ENTITY_TYPES: EntityType[] = [
  'stadium', 
  'league', 
  'team', 
  'division_conference',
  'broadcast_rights',
  'production_service',
  'brand'
];

export const EntityUpdateContainer: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);

  // Determine entity type based on the entity's properties
  const determineEntityType = (entity: Entity): EntityType | null => {
    if ('sport' in entity) {
      return 'league';
    } else if ('capacity' in entity) {
      return 'stadium';
    } else if ('league_id' in entity && 'stadium_id' in entity) {
      return 'team';
    } else if ('league_id' in entity && 'type' in entity) {
      return 'division_conference';
    } else if ('broadcast_company_id' in entity && 'entity_type' in entity) {
      return 'broadcast_rights';
    } else if ('production_company_id' in entity && 'entity_type' in entity) {
      return 'production_service';
    } else if ('industry' in entity) {
      return 'brand';
    }
    return null;
  };

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    setEntityType(determineEntityType(entity));
    setSearchQuery('');
    setSuggestions([]);
    setSearchPerformed(false);
  };

  const handleEntityUpdate = (updatedEntity: Entity) => {
    setSelectedEntity(updatedEntity);
  };

  // Handle manual search when no direct match is found
  const handleManualSearch = async (query: string) => {
    if (!query || query.length < 2) return;
    
    setSearchQuery(query);
    setIsLoading(true);
    setSearchPerformed(true);
    setSuggestions([]);
    
    try {
      // Use entity resolver to find suggestions with fuzzy matching
      const suggestionsPromises = SUPPORTED_ENTITY_TYPES.map(async type => {
        try {
          const entity = await entityResolver.resolveEntity(
            type, 
            query, 
            { 
              allowFuzzy: true, 
              minimumMatchScore: 0.4, // More lenient for suggestions
              throwOnError: false 
            }
          );
          
          if (!entity) return null;
          
          return {
            entity,
            entityType: type
          };
        } catch (error) {
          console.error(`Error getting suggestions for ${type}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(suggestionsPromises);
      const validSuggestions = results.filter(Boolean);
      
      setSuggestions(validSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear search state
  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSearchPerformed(false);
  };

  // Render the suggestions section
  const renderSuggestions = () => {
    if (!searchPerformed) return null;
    
    if (isLoading) {
      return (
        <Card>
          <Spin tip="Searching for suggestions...">
            <div style={{ padding: '50px 0', textAlign: 'center' }}>
              <Text type="secondary">Looking for matches to "{searchQuery}"</Text>
            </div>
          </Spin>
        </Card>
      );
    }
    
    if (suggestions.length === 0) {
      return (
        <Card>
          <Empty 
            description={
              <span>
                No matching entities found for "{searchQuery}"
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Button 
              type="primary" 
              // @ts-expect-error TS2739: AntD icon type issue
              icon={<ToolOutlined />}
              onClick={handleClearSearch}
            >
              Try Different Search
            </Button>
          </div>
        </Card>
      );
    }
    
    return (
      <Card title={`Suggested Matches for "${searchQuery}"`}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text>
            We found the following potential matches. Select the one you want to edit:
          </Text>
          <Divider />
          {suggestions.map((suggestion, index) => (
            <ResolutionSuggestion
              key={`${suggestion.entityType}_${suggestion.entity.id || index}`}
              entity={suggestion.entity}
              entityType={suggestion.entityType}
              onSelect={handleEntitySelect}
            />
          ))}
        </Space>
      </Card>
    );
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <Title level={2}>Update Existing Records</Title>
      
      <Alert
        message="Enhanced Entity Search"
        description="Search for existing entities with improved name matching. The system will find the best match even with partial names or typos, and suggest alternatives when an exact match isn't found."
        type="info"
        showIcon
      />

      <Card>
        <SmartEntitySearch
          onEntitySelect={handleEntitySelect}
          entityTypes={SUPPORTED_ENTITY_TYPES}
          placeholder="Search for an entity by name..."
          showMatchDetails={true}
          minimumMatchScore={0.6}
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Text type="secondary">
            Can't find what you're looking for?
          </Text>
          {' '}
          <Button 
            type="link" 
            // @ts-expect-error TS2739: AntD icon type issue
            icon={<SearchOutlined />}
            onClick={() => handleManualSearch(searchQuery || document.querySelector('input')?.value || '')}
          >
            Try manual search
          </Button>
        </div>
      </Card>

      {renderSuggestions()}

      {selectedEntity && entityType && (
        <EntityCard
          entity={selectedEntity}
          entityType={entityType}
          onUpdate={handleEntityUpdate}
          onSelectRelated={handleEntitySelect}
        />
      )}
    </Space>
  );
};

export default EntityUpdateContainer;