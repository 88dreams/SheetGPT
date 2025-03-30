import React, { useState, useEffect } from 'react';
import { Form, Alert, Space, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import FormField from './FormField';
import EntitySelectField from './EntitySelectField';
import { Team } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';
import { useFieldResolution } from '../../../../hooks/useFieldResolution';
import EntityResolutionBadge from '../EntityResolutionBadge';

interface TeamFieldsProps {
  entity: Team;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Enhanced team-specific form fields with entity resolution
 */
const TeamFields: React.FC<TeamFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues, stadiums, divisionConferences } = useEntityData('team');
  const [formValues, setFormValues] = useState<Record<string, any>>(entity);
  const [showContextHelp, setShowContextHelp] = useState(false);
  
  // Track form values for resolution context
  useEffect(() => {
    setFormValues(entity);
  }, [entity]);
  
  // Use field resolution for league
  const leagueResolution = useFieldResolution('league', 'league_id', formValues, {
    required: true,
    autoResolve: false
  });
  
  // Use field resolution for division/conference with league context
  const divisionResolution = useFieldResolution('division_conference', 'division_conference_id', formValues, {
    contextFields: { 'league_id': 'league_id' },
    dependentFields: ['league_id'],
    required: true
  });
  
  // Use field resolution for stadium
  const stadiumResolution = useFieldResolution('stadium', 'stadium_id', formValues, {
    required: true
  });
  
  // Filter division conferences by selected league
  const filteredDivisions = entity.league_id 
    ? divisionConferences.filter(div => div.league_id === entity.league_id)
    : divisionConferences;
  
  // Handle contextual field changes
  const handleDependentChange = (field: string, value: string | number) => {
    // Update the form value
    onChange(field, value);
    
    // Show context help when changing league if division is already set
    if (field === 'league_id' && entity.division_conference_id) {
      setShowContextHelp(true);
    }
  };
  
  return (
    <>
      <FormField
        field="name"
        label="Team Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
        helpText="The full name of the team"
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
        field="founded_year"
        label="Founded Year"
        type="number"
        value={entity.founded_year as number || 0}
        onChange={onChange}
        isEditing={isEditing}
      />
      
      {/* League relationship field with enhanced resolution */}
      <EntitySelectField
        field="league_id"
        label="League"
        value={entity.league_id}
        entityType="league"
        onChange={handleDependentChange}
        isEditing={isEditing}
        isRequired={true}
        options={leagues}
        placeholder="Select or search for a league..."
        helpText="The league this team is part of"
        showResolutionInfo={true}
        searchMode="enhanced"
      />
      
      {/* Show context help when changing fields with dependencies */}
      {showContextHelp && (
        <Alert
          message="League Changed"
          description="Changing the league may affect available divisions and conferences. Please verify your division/conference selection."
          type="info"
          showIcon
          closable
          onClose={() => setShowContextHelp(false)}
          style={{ marginBottom: 16 }}
        />
      )}
      
      {/* Division/Conference relationship field with enhanced resolution */}
      <EntitySelectField
        field="division_conference_id"
        label="Division/Conference"
        value={entity.division_conference_id}
        entityType="division_conference"
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
        options={filteredDivisions}
        placeholder="Select or search for a division/conference..."
        helpText="The division or conference within the league that this team belongs to"
        contextField="league_id"
        contextValue={entity.league_id}
        showResolutionInfo={true}
      />
      
      {/* Resolution information for division if fuzzy matched */}
      {divisionResolution.resolvedEntity && divisionResolution.resolutionInfo.fuzzyMatched && (
        <Form.Item>
          <Space align="center">
            <EntityResolutionBadge
              matchScore={divisionResolution.resolutionInfo.matchScore}
              fuzzyMatched={divisionResolution.resolutionInfo.fuzzyMatched}
              contextMatched={divisionResolution.resolutionInfo.contextMatched}
              virtualEntity={divisionResolution.resolutionInfo.virtualEntity}
            />
            <Tooltip title="This division/conference was resolved using fuzzy matching. Verify this is the correct one.">
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
            <span>Found a fuzzy match for this division/conference. Please verify it's correct.</span>
          </Space>
        </Form.Item>
      )}
      
      {/* Stadium relationship field with enhanced resolution */}
      <EntitySelectField
        field="stadium_id"
        label="Home Stadium"
        value={entity.stadium_id}
        entityType="stadium"
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
        options={stadiums}
        placeholder="Select or search for a stadium..."
        helpText="The stadium where this team plays home games"
        showResolutionInfo={true}
      />
    </>
  );
};

export default TeamFields;