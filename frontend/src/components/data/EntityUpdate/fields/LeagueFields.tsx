import React from 'react';
import FormField from './FormField';
import { League } from '../../../../types/sports';

interface LeagueFieldsProps {
  entity: League;
  onChange: (field: string, value: string | number | Date | null) => void;
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
      {/* Nickname is not on the League type in types/sports.ts. Commenting out for now.
      <FormField
        field="nickname"
        label="Nickname"
        type="text"
        value={entity.nickname || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      */}
      <FormField
        field="sport"
        label="Sport"
        type="text"
        value={entity.sport || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="country"
        label="Country"
        type="text"
        value={entity.country || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="broadcast_start_date"
        label="Broadcast Start Date"
        type="date"
        value={entity.broadcast_start_date || null}
        onChange={onChange}
        isEditing={isEditing}
        handleYearOnlyInput={true}
        placeholder="Enter year (e.g., 2025) or select date"
      />
      <FormField
        field="broadcast_end_date"
        label="Broadcast End Date"
        type="date"
        value={entity.broadcast_end_date || null}
        onChange={onChange}
        isEditing={isEditing}
        handleYearOnlyInput={true}
        placeholder="Enter year (e.g., 2025) or select date"
      />
    </>
  );
};

export default LeagueFields;