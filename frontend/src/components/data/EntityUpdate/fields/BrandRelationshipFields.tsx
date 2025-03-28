import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';

const { Text } = Typography;
const { Option } = Select;

interface BrandRelationshipFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Brand Relationship form fields
 */
const BrandRelationshipFields: React.FC<BrandRelationshipFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues, divisionConferences, brands } = useEntityData('brand_relationship');
  const brandRelationshipEntity = entity as any;
  
  const relationshipOptions = [
    { value: 'sponsor', label: 'Sponsor' },
    { value: 'partner', label: 'Partner' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'broadcaster', label: 'Broadcaster' },
    { value: 'advertiser', label: 'Advertiser' },
    { value: 'naming_rights', label: 'Naming Rights' },
    { value: 'other', label: 'Other' }
  ];
  
  return (
    <>
      <FormField
        field="name"
        label="Brand Relationship Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="relationship_type"
        label="Relationship Type"
        type="select"
        value={brandRelationshipEntity.relationship_type as string || 'sponsor'}
        onChange={onChange}
        isEditing={isEditing}
        options={relationshipOptions}
        isRequired={true}
      />
      <FormField
        field="start_date"
        label="Start Date"
        type="text"
        value={brandRelationshipEntity.start_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
        description="Format: YYYY-MM-DD (e.g., 2025-01-15) or just the year (e.g., 2025)"
      />
      <FormField
        field="end_date"
        label="End Date"
        type="text"
        value={brandRelationshipEntity.end_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        description="Format: YYYY-MM-DD (e.g., 2025-12-31) or just the year (e.g., 2025)"
      />
      
      {/* Brand relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Brand</Text>
            <Text type="danger">*</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={brandRelationshipEntity.brand_id}
          onChange={(val: string) => onChange('brand_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {brands.map((brand) => (
            <Option key={brand.id} value={brand.id}>
              {brand.name}
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
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={brandRelationshipEntity.entity_type}
          onChange={(val: string) => onChange('entity_type', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          <Option value="league">League</Option>
          <Option value="division_conference">Division/Conference</Option>
          <Option value="team">Team</Option>
          <Option value="player">Player</Option>
          <Option value="stadium">Stadium</Option>
        </Select>
      </Form.Item>
      
      {/* Entity selection based on entity type */}
      <Form.Item
        label={
          <Space>
            <Text>Entity</Text>
            <Text type="danger">*</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={brandRelationshipEntity.entity_id}
          onChange={(val: string) => onChange('entity_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {brandRelationshipEntity.entity_type === 'league' && leagues.map((entity) => (
            <Option key={entity.id} value={entity.id}>
              {entity.name}
            </Option>
          ))}
          
          {brandRelationshipEntity.entity_type === 'division_conference' && divisionConferences.map((entity) => (
            <Option key={entity.id} value={entity.id}>
              {entity.name}
            </Option>
          ))}
          
          {/* Add options for other entity types as needed */}
        </Select>
      </Form.Item>
    </>
  );
};

export default BrandRelationshipFields;