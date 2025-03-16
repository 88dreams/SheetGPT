import React from 'react';
import { Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import { EditOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface FormFieldProps {
  field: string;
  label: string;
  type: 'text' | 'number' | 'select';
  value: string | number;
  onChange: (field: string, value: string | number) => void;
  isEditing: boolean;
  isRequired?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * A reusable form field component with consistent styling
 */
const FormField: React.FC<FormFieldProps> = ({
  field,
  label,
  type,
  value,
  onChange,
  isEditing,
  isRequired = false,
  options = [],
  placeholder,
}) => {
  return (
    <Form.Item
      label={
        <Space>
          <Text>{label}</Text>
          {isRequired ? <Text type="danger">*</Text> : null}
          {isEditing ? <EditOutlined /> : <LockOutlined />}
        </Space>
      }
      required={isRequired}
    >
      {type === 'text' && (
        <Input
          value={value as string}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={!isEditing}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        />
      )}
      {type === 'number' && (
        <InputNumber
          value={value as number}
          onChange={(val) => val !== null && onChange(field, val)}
          disabled={!isEditing}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          style={{ width: '100%' }}
        />
      )}
      {type === 'select' && (
        <Select
          value={value as string}
          onChange={(val) => onChange(field, val)}
          disabled={!isEditing}
          style={{ width: '100%' }}
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
        >
          {options.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
      )}
    </Form.Item>
  );
};

export default FormField;