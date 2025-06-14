import React, { useEffect, useState } from 'react';
import { Form, Select, Space, Typography, Tag } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { DivisionConference } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';

const { Text } = Typography;
const { Option } = Select;

interface DivisionConferenceFieldsProps {
  entity: DivisionConference;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Division/Conference-specific form fields
 */
const DivisionConferenceFields: React.FC<DivisionConferenceFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues } = useEntityData('division_conference');
  const [selectedLeagueSport, setSelectedLeagueSport] = useState<string | null>(null);
  
  // Update the sport whenever the league changes
  useEffect(() => {
    if (entity.league_id) {
      const selectedLeague = leagues.find(league => league.id === entity.league_id);
      if (selectedLeague && selectedLeague.sport) {
        setSelectedLeagueSport(selectedLeague.sport);
      } else {
        setSelectedLeagueSport(null); // League not found or has no sport
      }
    } else {
      setSelectedLeagueSport(null); // No league_id
    }
  }, [entity.league_id, leagues]);
  
  return (
    <>
      <FormField
        field="name"
        label="Division/Conference Name"
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
        value={entity.nickname || ''}
        onChange={onChange}
        isEditing={isEditing}
        helpText="Short abbreviation or code (e.g., AFC, NFC)"
      />
      <FormField
        field="type"
        label="Type"
        type="text"
        value={entity.type || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="region"
        label="Region"
        type="text"
        value={entity.region || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="description"
        label="Description"
        type="text"
        value={entity.description || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      
      {/* Display Sport field (read-only) */}
      <Form.Item
        label={
          <Space>
            <Text>Sport</Text>
            {/* @ts-expect-error TS2739: AntD icon type issue */}
            <LockOutlined />
          </Space>
        }
      >
        {selectedLeagueSport ? (
          <Tag color="blue">{selectedLeagueSport}</Tag>
        ) : (
          <Text type="secondary">Not available</Text>
        )}
      </Form.Item>
      
      {/* League relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>League</Text>
            <Text type="danger">*</Text>
            {/* @ts-expect-error TS2739: AntD icon type issue */}
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={entity.league_id}
          onChange={(val: string) => onChange('league_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {leagues.map((league) => (
            <Option key={league.id} value={league.id}>
              {league.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );
};

export default DivisionConferenceFields;