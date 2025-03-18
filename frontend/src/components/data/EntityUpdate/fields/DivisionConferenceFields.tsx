import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
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
        value={entity.nickname as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        helpText="Short abbreviation or code (e.g., AFC, NFC)"
      />
      <FormField
        field="type"
        label="Type"
        type="text"
        value={entity.type as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="region"
        label="Region"
        type="text"
        value={entity.region as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      <FormField
        field="description"
        label="Description"
        type="text"
        value={entity.description as string || ''}
        onChange={onChange}
        isEditing={isEditing}
      />
      
      {/* League relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>League</Text>
            <Text type="danger">*</Text>
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