import React, { useState, useEffect } from 'react';
import FormField from './FormField';
import EntitySelectField from './EntitySelectField';
import { Player } from '../../../../types/sports';
import { api } from '../../../../utils/api'; // To fetch distinct sports

interface PlayerFieldsProps {
  entity: Player;
  onChange: (field: string, value: string | number | null) => void; // Allow null for optional fields
  isEditing: boolean;
}

const PlayerFields: React.FC<PlayerFieldsProps> = ({ entity, onChange, isEditing }) => {
  const [sportOptions, setSportOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const fetchSports = async () => {
      try {
        const distinctSports: string[] = await api.sports.getDistinctSports();
        setSportOptions(distinctSports.map(sport => ({ label: sport, value: sport })));
      } catch (error) {
        console.error("Error fetching distinct sports:", error);
        // Potentially set a default or show an error
      }
    };
    fetchSports();
  }, []);

  return (
    <>
      <FormField
        field="name"
        label="Player Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <EntitySelectField
        field="team_id"
        label="Team"
        value={entity.team_id || null} // Ensure null if not set, as it's optional
        entityType="team"
        onChange={onChange}
        isEditing={isEditing}
        isRequired={false} // Changed to false
        placeholder="Select or search for a team..."
        helpText="The team the player belongs to (optional for individual athletes)"
      />
      <FormField
        field="position"
        label="Position"
        type="text"
        value={entity.position || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="sport"
        label="Sport"
        type="select"
        value={entity.sport || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={sportOptions}
        placeholder="Select sport..."
        allowCustomEntry={true} // Allow entering a sport if not in the list
        helpText="The primary sport of the player"
      />
      <EntitySelectField
        field="sponsor_id"
        label="Sponsor"
        value={entity.sponsor_id || null} // Ensure null if not set
        entityType="brand"
        onChange={onChange}
        isEditing={isEditing}
        isRequired={false} // Sponsor is optional
        placeholder="Select or search for a sponsor (Brand)..."
        helpText="The brand sponsoring the player"
      />
      <FormField
        field="jersey_number"
        label="Jersey Number"
        type="number"
        value={entity.jersey_number === undefined || entity.jersey_number === null ? '' : entity.jersey_number}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="college"
        label="College"
        type="text"
        value={entity.college || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
    </>
  );
};

export default PlayerFields; 