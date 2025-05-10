import React from 'react';
import { Form, Input, InputNumber, Select, Space, Typography, DatePicker, DatePickerProps, Tooltip } from 'antd';
import { EditOutlined, LockOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

interface FormFieldProps {
  field: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  value: string | number | Date | null;
  onChange: (field: string, value: string | number | Date | null) => void;
  isEditing: boolean;
  isRequired?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  handleYearOnlyInput?: boolean;
  allowCustomEntry?: boolean;
  helpText?: string;
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
  handleYearOnlyInput = false,
  allowCustomEntry = false,
  helpText,
}) => {
  // Handler for date inputs that checks for year-only input
  const handleDateChange = (date: dayjs.Dayjs | null, dateString: string) => {
    if (!date) {
      onChange(field, null);
      return;
    }

    if (handleYearOnlyInput && dateString.length === 4 && /^\d{4}$/.test(dateString)) {
      // Year-only input detected
      const year = parseInt(dateString, 10);
      
      // If this is a start date field, use January 1
      if (field.includes('start')) {
        const startDate = new Date(year, 0, 1); // January 1st of the year
        onChange(field, startDate);
      } 
      // If this is an end date field, use December 31
      else if (field.includes('end')) {
        const endDate = new Date(year, 11, 31); // December 31st of the year
        onChange(field, endDate);
      }
      // For other date fields, just use the selected date
      else {
        onChange(field, date.toDate());
      }
    } else {
      // Normal date input
      onChange(field, date.toDate());
    }
  };

  // Convert string date to dayjs for DatePicker
  const getDateValue = () => {
    if (!value) return null;
    return dayjs(value instanceof Date ? value : value.toString());
  };

  return (
    <Form.Item
      label={
        <Space>
          <Text>{label}</Text>
          {isRequired ? <Text type="danger">*</Text> : null}
          {/* @ts-expect-error TS2739: AntD icon type issue */}
          {isEditing ? <EditOutlined /> : <LockOutlined />}
          {helpText && (
            <Tooltip title={helpText}>
              {/* @ts-expect-error TS2739: AntD icon type issue */}
              <InfoCircleOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
            </Tooltip>
          )}
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
          mode={allowCustomEntry ? 'tags' : undefined}
          showSearch
          filterOption={(input, option) =>
            (option?.label?.toString().toLowerCase() ?? '').includes(input.toLowerCase())
          }
        >
          {options.map((opt) => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
      )}
      {type === 'date' && (
        <DatePicker
          value={getDateValue()}
          onChange={handleDateChange}
          disabled={!isEditing}
          style={{ width: '100%' }}
          placeholder={placeholder || `Select ${label.toLowerCase()}`}
          format={handleYearOnlyInput ? ['YYYY-MM-DD', 'YYYY'] : 'YYYY-MM-DD'}
        />
      )}
    </Form.Item>
  );
};

export default FormField;