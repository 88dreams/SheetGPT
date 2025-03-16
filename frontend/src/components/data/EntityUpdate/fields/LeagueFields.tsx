import React from 'react';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';

interface LeagueFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * League-specific form fields
 */
const LeagueFields: React.FC<LeagueFieldsProps> = ({ entity, onChange, isEditing }) => {
  return (
    <>
      <FormField
        field="name"
        label="League Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="nickname"
        label="Nickname"
        type="text"
        value={entity.nickname as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="sport"
        label="Sport"
        type="text"
        value={entity.sport as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="country"
        label="Country"
        type="text"
        value={entity.country as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
    </>
  );
};

export default LeagueFields;