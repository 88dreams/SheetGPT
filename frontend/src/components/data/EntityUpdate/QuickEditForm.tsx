import React from 'react';
import { Form } from 'antd';
import { Entity, EntityType, Team, Stadium, League, DivisionConference, BroadcastRights, ProductionService, Brand, Player } from '../../../types/sports';
import FormField from './fields/FormField';
import TeamFields from './fields/TeamFields';
import StadiumFields from './fields/StadiumFields';
import LeagueFields from './fields/LeagueFields';
import DivisionConferenceFields from './fields/DivisionConferenceFields';
import BroadcastFields from './fields/BroadcastFields';
import ProductionFields from './fields/ProductionFields';
import BrandFields from './fields/BrandFields';
import PlayerFields from './fields/PlayerFields';

interface QuickEditFormProps {
  entity: Entity;
  entityType: EntityType;
  isEditing: boolean;
  onChange: (updatedEntity: Entity) => void;
  showAllFields?: boolean;
}

/**
 * Enhanced QuickEditForm that uses specialized entity field components
 * with entity resolution capabilities
 */
export const QuickEditForm: React.FC<QuickEditFormProps> = ({
  entity,
  entityType,
  isEditing,
  onChange,
  showAllFields = false
}) => {
  // Handler for field changes
  const handleFieldChange = (field: string, value: string | number | Date | null) => {
    onChange({
      ...entity,
      [field]: value,
    } as Entity);
  };

  // Generic fields for entity types without specialized components
  const renderGenericFields = () => (
    <>
      <FormField
        field="name"
        label="Name"
        type="text"
        value={entity.name || ''}
        onChange={handleFieldChange}
        isEditing={isEditing}
        isRequired={true}
        helpText="The name of this entity"
      />
    </>
  );

  return (
    <Form layout="vertical" style={{ maxWidth: 600 }}>
      {/* Render appropriate fields based on entity type with type casting */}
      {entityType === 'team' && <TeamFields entity={entity as Team} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'stadium' && <StadiumFields entity={entity as Stadium} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'league' && <LeagueFields entity={entity as League} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'division_conference' && <DivisionConferenceFields entity={entity as DivisionConference} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'broadcast' && <BroadcastFields entity={entity as BroadcastRights} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'production' && <ProductionFields entity={entity as ProductionService} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'brand' && <BrandFields entity={entity as Brand} onChange={handleFieldChange} isEditing={isEditing} />}
      {entityType === 'player' && <PlayerFields entity={entity as Player} onChange={handleFieldChange} isEditing={isEditing} />}
      
      {/* Generic fallback for other entity types */}
      {!['team', 'stadium', 'league', 'division_conference', 'broadcast', 'production', 'brand', 'player'].includes(entityType) &&
        renderGenericFields()
      }
    </Form>
  );
};

export default QuickEditForm; 