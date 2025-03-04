import React, { useState } from 'react';
import { Card, Tabs, Space, Button, message } from 'antd';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';
import { QuickEditForm } from './QuickEditForm';
import { AdvancedEditForm } from './AdvancedEditForm';
import { useApiClient } from '../../../hooks/useApiClient';

interface EntityCardProps {
  entity: Entity;
  entityType: EntityType;
  onUpdate: (updatedEntity: Entity) => void;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  entityType,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('quick');
  const [editedEntity, setEditedEntity] = useState<Entity>(entity);
  const apiClient = useApiClient();

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
  ];

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Button
            type={isEditing ? "primary" : "default"}
            icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          >
            {isEditing ? 'Save Changes' : 'Edit'}
          </Button>
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