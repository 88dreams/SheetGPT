import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';

const { Text } = Typography;
const { Option } = Select;

interface ProductionFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Production-specific form fields
 */
const ProductionFields: React.FC<ProductionFieldsProps> = ({ entity, onChange, isEditing }) => {
  const { leagues, divisionConferences, productionCompanies } = useEntityData('production');
  const productionEntity = entity as any;
  
  return (
    <>
      <FormField
        field="name"
        label="Production Service Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="service_type"
        label="Service Type"
        type="text"
        value={productionEntity.service_type as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="start_date"
        label="Start Date"
        type="text"
        value={productionEntity.start_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="end_date"
        label="End Date"
        type="text"
        value={productionEntity.end_date as string || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      
      {/* Production Company relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Production Company</Text>
            <Text type="danger">*</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={productionEntity.production_company_id}
          onChange={(val: string) => onChange('production_company_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {productionCompanies.map((company) => (
            <Option key={company.id} value={company.id}>
              {company.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      
      {/* Secondary Brand relationship field */}
      <Form.Item
        label={
          <Space>
            <Text>Employing Brand</Text>
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        tooltip="The brand that hired this production company (optional)"
      >
        <Select
          value={productionEntity.secondary_brand_id}
          onChange={(val: string) => onChange('secondary_brand_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
          allowClear
        >
          {productionCompanies.map((company) => (
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
            {isEditing ? <EditOutlined /> : <LockOutlined />}
          </Space>
        }
        required={true}
      >
        <Select
          value={productionEntity.entity_type}
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
          value={productionEntity.entity_id}
          onChange={(val: string) => onChange('entity_id', val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
        >
          {productionEntity.entity_type === 'league' && leagues.map((entity) => (
            <Option key={entity.id} value={entity.id}>
              {entity.name}
            </Option>
          ))}
          
          {productionEntity.entity_type === 'division_conference' && divisionConferences.map((entity) => (
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

export default ProductionFields;