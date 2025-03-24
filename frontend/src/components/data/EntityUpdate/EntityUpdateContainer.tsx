import React, { useState } from 'react';
import { Card, Space, Typography, Alert } from 'antd';
import { Entity, EntityType } from '../../../types/sports';
import SmartEntitySearch from './SmartEntitySearch';
import EntityCard from './EntityCard';

const { Title } = Typography;

const SUPPORTED_ENTITY_TYPES: EntityType[] = [
  'stadium', 
  'league', 
  'team', 
  'division_conference',
  'broadcast',
  'production',
  'brand',
  'brand_relationship'
];

export const EntityUpdateContainer: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityType, setEntityType] = useState<EntityType | null>(null);

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    // Determine entity type based on the entity's properties
    if ('sport' in entity) {
      setEntityType('league');
    } else if ('capacity' in entity) {
      setEntityType('stadium');
    } else if ('league_id' in entity && 'stadium_id' in entity) {
      setEntityType('team');
    } else if ('league_id' in entity && 'type' in entity) {
      setEntityType('division_conference');
    } else if ('broadcast_company_id' in entity && 'entity_type' in entity) {
      setEntityType('broadcast');
    } else if ('production_company_id' in entity && 'entity_type' in entity) {
      setEntityType('production');
    } else if ('industry' in entity && !('entity_type' in entity)) {
      setEntityType('brand');
    } else if ('brand_id' in entity && 'entity_type' in entity) {
      setEntityType('brand_relationship');
    }
  };

  const handleEntityUpdate = (updatedEntity: Entity) => {
    setSelectedEntity(updatedEntity);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', padding: 24 }}>
      <Title level={2}>Update Existing Records</Title>
      
      <Alert
        message="Smart Entity Update"
        description="Search for an existing entity (Leagues, Teams, Brands, etc.) to update its information. The system will prevent duplicate names and maintain data consistency."
        type="info"
        showIcon
      />

      <Card>
        <SmartEntitySearch
          onEntitySelect={handleEntitySelect}
          entityTypes={SUPPORTED_ENTITY_TYPES}
        />
      </Card>

      {selectedEntity && entityType && (
        <EntityCard
          entity={selectedEntity}
          entityType={entityType}
          onUpdate={handleEntityUpdate}
        />
      )}
    </Space>
  );
};

export default EntityUpdateContainer; 