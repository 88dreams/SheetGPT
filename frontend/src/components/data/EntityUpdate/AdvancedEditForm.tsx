import React from 'react';
import { Form, Space, Spin } from 'antd';
import { Entity, EntityType, Team, Stadium, League, DivisionConference, BroadcastRights, ProductionService, Brand } from '../../../types/sports';
import EntityRelatedInfo from './EntityRelatedInfo';
import { 
  StadiumFields, 
  LeagueFields, 
  TeamFields, 
  DivisionConferenceFields,
  BrandFields,
  BroadcastFields,
  ProductionFields
} from './fields';

interface AdvancedEditFormProps {
  entity: Entity;
  entityType: EntityType;
  isEditing: boolean;
  onChange: (updatedEntity: Entity) => void;
  showAllFields?: boolean;
}

/**
 * Advanced form for editing entity details
 * Renders different fields based on entity type
 */
export const AdvancedEditForm: React.FC<AdvancedEditFormProps> = ({
  entity,
  entityType,
  isEditing,
  onChange,
}) => {
  // Simple handler for field changes
  const handleFieldChange = (field: string, value: string | number | Date | null) => {
    onChange({
      ...entity,
      [field]: value,
    });
  };

  // Render the appropriate field component based on entity type
  const renderEntityFields = () => {
    switch (entityType) {
      case 'stadium':
        return <StadiumFields entity={entity as Stadium} onChange={handleFieldChange} isEditing={isEditing} />;
      
      case 'league':
        return <LeagueFields entity={entity as League} onChange={handleFieldChange} isEditing={isEditing} />;
      
      case 'division_conference':
        return <DivisionConferenceFields 
                entity={entity as DivisionConference} 
                onChange={handleFieldChange} 
                isEditing={isEditing} 
              />;
      
      case 'team':
        return <TeamFields 
                entity={entity as Team} 
                onChange={handleFieldChange} 
                isEditing={isEditing} 
              />;
      
      case 'broadcast':
        return <BroadcastFields 
                entity={entity as BroadcastRights} 
                onChange={handleFieldChange} 
                isEditing={isEditing} 
              />;
      
      case 'production':
        return <ProductionFields 
                entity={entity as ProductionService} 
                onChange={handleFieldChange} 
                isEditing={isEditing} 
              />;
      
      case 'brand':
        return <BrandFields 
                entity={entity as Brand} 
                onChange={handleFieldChange} 
                isEditing={isEditing} 
              />;
              
      // brand_relationship entity type is no longer supported
      // Instead, use the partner fields in the Brand entity
      
      default:
        return <div>No editor available for entity type: {entityType}</div>;
    }
  };

  // If entity doesn't have an ID yet, it's a new entity
  if (!entity.id) {
    return (
      <div className="text-center py-8">
        <Spin />
        <div className="mt-2 text-gray-500">Loading entity data...</div>
      </div>
    );
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {/* Form with entity-specific fields */}
      <Form layout="vertical" style={{ maxWidth: 600 }}>
        {renderEntityFields()}
      </Form>
      
      {/* Related entities and change history */}
      <EntityRelatedInfo entity={entity} entityType={entityType} />
    </Space>
  );
};

export default AdvancedEditForm; 