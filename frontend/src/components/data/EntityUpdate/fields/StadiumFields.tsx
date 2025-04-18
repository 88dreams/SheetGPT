import React from 'react';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';

interface StadiumFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Stadium-specific form fields
 */
const StadiumFields: React.FC<StadiumFieldsProps> = ({ entity, onChange, isEditing }) => {
  return (
    <>
      <FormField
        field="name"
        label="Stadium Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="city"
        label="City"
        type="text"
        value={entity.city as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="state"
        label="State"
        type="text"
        value={entity.state as string || ''}
        onChange={onChange}
        isEditing={isEditing}
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
      <FormField
        field="capacity"
        label="Capacity"
        type="number"
        value={entity.capacity as number || 0}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="owner"
        label="Owner"
        type="text"
        value={entity.owner as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="naming_rights_holder"
        label="Naming Rights Holder"
        type="text"
        value={entity.naming_rights_holder as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="host_broadcaster"
        label="Host Broadcaster"
        type="text"
        value={entity.host_broadcaster as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
    </>
  );
};

export default StadiumFields;