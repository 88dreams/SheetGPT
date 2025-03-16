import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Team } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';
import SmartEntitySearch from '../SmartEntitySearch';

const { Text } = Typography;
const { Option } = Select;

interface TeamFieldsProps {
  entity: Team;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Team-specific form fields
 */
const TeamFields: React.FC<TeamFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues, stadiums, divisionConferences } = useEntityData('team');
  
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
      
      {/* Division/Conference relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Division/Conference</Text>
            <Text type="danger">*</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        {isEditing ? (
          <SmartEntitySearch 
            entityTypes={['division_conference']} 
            entities={divisionConferences.filter(div => div.league_id === entity.league_id)}
            placeholder="Search for a division or conference..."
            onEntitySelect={(selectedEntity) => {
              onChange('division_conference_id', selectedEntity.id);
            }}
          />
        ) : (
          <div>
            {divisionConferences.find(div => div.id === entity.division_conference_id)?.name || 'None selected'}
          </div>
        )}
      </Form.Item>
      
      {entity.division_conference_id && (
        <Form.Item label="Selected Division/Conference">
          <Text>
            {divisionConferences.find(dc => dc.id === entity.division_conference_id)?.name || 'Unknown Division/Conference'}
          </Text>
        </Form.Item>
      )}
      
      {/* Stadium relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Home Stadium</Text>
            <Text type="danger">*</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={entity.stadium_id}
          onChange={(val: string) => onChange('stadium_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {stadiums.map((stadium) => (
            <Option key={stadium.id} value={stadium.id}>
              {stadium.name} ({stadium.city}, {stadium.country})
            </Option>
          ))}
        </Select>
      </Form.Item>
    </>
  );
};

export default TeamFields;