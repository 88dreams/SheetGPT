import React from 'react';
import { Form, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';
import FormField from './FormField';
import { Entity } from '../../../../types/sports';
import { useEntityData } from '../hooks/useEntityData';

const { Text } = Typography;
const { Option } = Select;

interface BrandFieldsProps {
  entity: Entity;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
}

/**
 * Brand form fields - for editing a brand company entity
 */
const BrandFields: React.FC<BrandFieldsProps> = ({ entity, onChange, isEditing }) => {
  // List of industries for the dropdown
  const industryOptions = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Sports Equipment', label: 'Sports Equipment' },
    { value: 'Apparel', label: 'Apparel' },
    { value: 'Entertainment', label: 'Entertainment' },
    { value: 'Media', label: 'Media' },
    { value: 'Telecommunications', label: 'Telecommunications' },
    { value: 'Automotive', label: 'Automotive' },
    { value: 'Food and Beverage', label: 'Food and Beverage' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Other', label: 'Other' }
  ];
  
  return (
    <>
      <FormField
        field="name"
        label="Brand Name"
        type="text"
        value={entity.name || ''}
        onChange={onChange}
        isEditing={isEditing}
        isRequired={true}
      />
      <FormField
        field="industry"
        label="Industry"
        type="select"
        value={(entity as any).industry || ''}
        onChange={onChange}
        isEditing={isEditing}
        options={industryOptions}
        isRequired={true}
      />
    </>
  );
};

export default BrandFields;