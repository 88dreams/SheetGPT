import React, { useState, useEffect } from 'react';
import FormField from './FormField';
import { Stadium } from '../../../../types/sports';
import { api } from '../../../../utils/api';

interface StadiumFieldsProps {
  entity: Stadium;
  onChange: (field: string, value: string | number | null) => void;
  isEditing: boolean;
}

/**
 * Stadium-specific form fields
 */
const StadiumFields: React.FC<StadiumFieldsProps> = ({ entity, onChange, isEditing }) => {
  const [sportOptions, setSportOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const distinctSports: string[] = await api.sports.getDistinctSports();
        setSportOptions(distinctSports.map(sport => ({ label: sport, value: sport })));
      } catch (error) {
        console.error("Error fetching distinct sports:", error);
      }
    };
    fetchSports();
  }, []);

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
        value={entity.city || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="state"
        label="State"
        type="text"
        value={entity.state || ''}
        onChange={onChange}
        isEditing={isEditing}
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
        field="sport"
        label="Primary Sport Hosted"
        type="select"
        value={entity.sport || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={sportOptions}
        placeholder="Select primary sport..."
        allowCustomEntry={true}
        helpText="The main sport played at this stadium (optional)"
      />
      <FormField
        field="capacity"
        label="Capacity"
        type="number"
        value={entity.capacity === undefined || entity.capacity === null ? '' : entity.capacity}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="owner"
        label="Owner"
        type="text"
        value={entity.owner || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="naming_rights_holder"
        label="Naming Rights Holder"
        type="text"
        value={entity.naming_rights_holder || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="host_broadcaster"
        label="Host Broadcaster"
        type="text"
        value={entity.host_broadcaster || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
    </>
  );
};

export default StadiumFields;