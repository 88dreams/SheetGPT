import React, { useState, useEffect } from 'react';
import { Card, Tabs, Space, Button, message, Typography } from 'antd';
import { EditOutlined, SaveOutlined, LinkOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';
import { QuickEditForm } from './QuickEditForm';
import { AdvancedEditForm } from './AdvancedEditForm';
import EntityRelatedInfo from './EntityRelatedInfo';
import { useApiClient } from '../../../hooks/useApiClient';
import EntityResolutionBadge from './EntityResolutionBadge';
import { apiCache } from '../../../utils/apiCache';

const { Text, Title } = Typography;

interface EntityCardProps {
  entity: Entity;
  entityType: EntityType;
  onUpdate: (updatedEntity: Entity) => void;
  onSelectRelated?: (entity: Entity) => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  entityType,
  onUpdate,
  onSelectRelated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [editedEntity, setEditedEntity] = useState<Entity>(entity);
  const [resolutionInfo, setResolutionInfo] = useState<any>(null);
  const apiClient = useApiClient();

  // Get resolution info from cache if available
  useEffect(() => {
    const cacheKey = `resolve_entity_${entityType}_${entity.name}`;
    const cachedResponse = apiCache.get(cacheKey);
    if (cachedResponse?.resolution_info) {
      setResolutionInfo(cachedResponse.resolution_info);
    }
  }, [entity, entityType]);

  const handleSave = async () => {
    try {
      const response = await apiClient.put(`/api/v1/${entityType}s/${entity.id}`, editedEntity);
      if (response.data) {
        onUpdate(response.data);
        message.success('Entity updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating entity:', error);
      message.error('Failed to update entity');
    }
  };

  const handleChange = (updatedEntity: Entity) => {
    setEditedEntity(updatedEntity);
  };

  // Gets title component with resolution badge if available
  const getEntityTitle = () => {
    return (
      <Space align="center">
        <Title level={4} style={{ margin: 0 }}>
          {entity.name}
        </Title>
        {resolutionInfo && (
          <EntityResolutionBadge
            matchScore={resolutionInfo.match_score}
            fuzzyMatched={resolutionInfo.fuzzy_matched}
            contextMatched={resolutionInfo.context_matched}
            virtualEntity={resolutionInfo.virtual_entity}
          />
        )}
      </Space>
    );
  };

  // Build tab items including the related info tab
  const items = [
    {
      key: 'quick',
      label: 'Quick Edit',
      children: (
        <QuickEditForm
          entity={editedEntity}
          entityType={entityType}
          isEditing={isEditing}
          onChange={handleChange}
          showAllFields={true}
        />
      ),
    },
    {
      key: 'advanced',
      label: 'Advanced Edit',
      children: (
        <AdvancedEditForm
          entity={editedEntity}
          entityType={entityType}
          isEditing={isEditing}
          onChange={handleChange}
          showAllFields={true}
        />
      ),
    },
    {
      key: 'related',
      label: 'Related Entities',
      children: (
        <EntityRelatedInfo
          entity={entity}
          entityType={entityType}
          onEntitySelect={onSelectRelated}
        />
      ),
    }
  ];

  return (
    <Card title={getEntityTitle()}>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Button
            type={isEditing ? "primary" : "default"}
            icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? 'Save Changes' : 'Edit'}
          </Button>
          
          {/* Show resolution information if available */}
          {resolutionInfo && resolutionInfo.resolved_via && (
            <Text type="secondary">
              Resolved via: {resolutionInfo.resolved_via}
            </Text>
          )}
        </Space>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
      />
    </Card>
  );
};

export default EntityCard;