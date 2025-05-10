import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';
import SmartEntitySearch from '../SmartEntitySearch';

const { Text } = Typography;
const { Option } = Select;

interface BroadcastFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Broadcast-specific form fields
 */
const BroadcastFields: React.FC<BroadcastFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues, divisionConferences, broadcastCompanies } = useEntityData('broadcast');
  const broadcastEntity = entity as any;
  
  return (
    <>
      {/* Name field removed as it's redundant with Broadcast Company Name */}
      <FormField
        field="territory"
        label="Territory"
        type="text"
        value={broadcastEntity.territory as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="start_date"
        label="Start Date"
        type="text"
        value={broadcastEntity.start_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="end_date"
        label="End Date"
        type="text"
        value={broadcastEntity.end_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="is_exclusive"
        label="Exclusive"
        type="select"
        value={broadcastEntity.is_exclusive as string || 'false'}
        onChange={onChange}
        isEditing={isEditing}
        options={[
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' }
        ]}
      />
      
      {/* Broadcast Company relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Broadcast Company</Text>
            <Text type="danger">*</Text>
            {/* @ts-expect-error TS2739: AntD icon type issue */}
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={broadcastEntity.broadcast_company_id}
          onChange={(val: string) => onChange('broadcast_company_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {broadcastCompanies.map((company) => (
            <Option key={company.id} value={company.id}>
              {company.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      
      {/* Entity Type selection */}
      <Form.Item
        label={
          <Space>
            <Text>Entity Type</Text>
            <Text type="danger">*</Text>
            {/* @ts-expect-error TS2739: AntD icon type issue */}
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={broadcastEntity.entity_type}
          onChange={(val: string) => onChange('entity_type', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          <Option value="league">League</Option>
          <Option value="division_conference">Division/Conference</Option>
          <Option value="team">Team</Option>
          <Option value="game">Game</Option>
        </Select>
      </Form.Item>
      
      {/* Conditional fields based on entity type */}
      {broadcastEntity.entity_type === 'league' && (
        <Form.Item
          label={
            <Space>
              <Text>Entity</Text>
              <Text type="danger">*</Text>
              {/* @ts-expect-error TS2739: AntD icon type issue */}
              {isEditing ? <EditOutlined /> : <LockOutlined />}
            </Space>
          }
          required={true}
        >
          <Select
            value={broadcastEntity.entity_id}
            onChange={(val: string) => onChange('entity_id', val)}
            disabled={!isEditing}
            style={{ width: '100%' }}
          >
            {leagues.map((entity) => (
              <Option key={entity.id} value={entity.id}>
                {entity.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}
      
      {broadcastEntity.entity_type === 'division_conference' && (
        <>
          <Form.Item
            label={
              <Space>
                <Text>Division/Conference</Text>
                <Text type="danger">*</Text>
                {/* @ts-expect-error TS2739: AntD icon type issue */}
                {isEditing ? <EditOutlined /> : <LockOutlined />}
              </Space>
            }
            required={true}
          >
            <SmartEntitySearch 
              entityTypes={['division_conference']} 
              placeholder="Search for a division or conference..."
              onEntitySelect={(selectedEntity) => {
                // Set division_conference_id to the selected division's ID
                onChange('division_conference_id', selectedEntity.id);
                
                // Find the division in our list to get its league_id
                const divConf = divisionConferences.find(dc => dc.id === selectedEntity.id);
                if (divConf && divConf.league_id) {
                  // Set entity_id to the division's league_id for entity-level rights
                  onChange('entity_id', divConf.league_id);
                }
              }}
            />
          </Form.Item>
          
          {broadcastEntity.division_conference_id && (
            <Form.Item label="Selected Division/Conference">
              <Text>
                {divisionConferences.find(dc => dc.id === broadcastEntity.division_conference_id)?.name || 'Unknown Division/Conference'}
              </Text>
            </Form.Item>
          )}
          
          {broadcastEntity.entity_id && (
            <Form.Item label="Associated League">
              <Text>
                {leagues.find(l => l.id === broadcastEntity.entity_id)?.name || 'Unknown League'}
              </Text>
            </Form.Item>
          )}
        </>
      )}
      
      {!['league', 'division_conference'].includes(broadcastEntity.entity_type) && (
        <Form.Item
          label={
            <Space>
              <Text>Entity</Text>
              <Text type="danger">*</Text>
              {/* @ts-expect-error TS2739: AntD icon type issue */}
              {isEditing ? <EditOutlined /> : <LockOutlined />}
            </Space>
          }
          required={true}
        >
          <Select
            value={broadcastEntity.entity_id}
            onChange={(val: string) => onChange('entity_id', val)}
            disabled={!isEditing}
            style={{ width: '100%' }}
          >
            {/* Add options for other entity types as needed */}
          </Select>
        </Form.Item>
      )}
    </>
  );
};

export default BroadcastFields;