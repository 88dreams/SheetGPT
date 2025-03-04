import React from 'react';
import { Form, Input, Select, InputNumber, Typography, Space } from 'antd';
import { Entity, EntityType } from '../../../types/sports';
import { EditOutlined, LockOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface QuickEditFormProps {
  entity: Entity;
  entityType: EntityType;
  isEditing: boolean;
  onChange: (updatedEntity: Entity) => void;
}

export const QuickEditForm: React.FC<QuickEditFormProps> = ({
  entity,
  entityType,
  isEditing,
  onChange,
}) => {
  const handleFieldChange = (field: string, value: any) => {
    onChange({
      ...entity,
      [field]: value,
    });
  };

  const renderField = (field: string, label: string, type: 'text' | 'number' | 'select', options?: { value: string; label: string }[]) => {
    const value = entity[field as keyof Entity];
    const isRequired = ['name', 'city', 'country'].includes(field);

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
            onChange={(e) => handleFieldChange(field, e.target.value)}
            disabled={!isEditing || isRequired}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}
        {type === 'number' && (
          <InputNumber
            value={value as number}
            onChange={(val) => handleFieldChange(field, val)}
            disabled={!isEditing}
            placeholder={`Enter ${label.toLowerCase()}`}
            style={{ width: '100%' }}
          />
        )}
        {type === 'select' && options && (
          <Select
            value={value as string}
            onChange={(val) => handleFieldChange(field, val)}
            disabled={!isEditing}
            style={{ width: '100%' }}
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

  const renderStadiumFields = () => (
    <>
      {renderField('name', 'Stadium Name', 'text')}
      {renderField('city', 'City', 'text')}
      {renderField('state', 'State', 'text')}
      {renderField('country', 'Country', 'text')}
      {renderField('capacity', 'Capacity', 'number')}
      {renderField('owner', 'Owner', 'text')}
      {renderField('naming_rights_holder', 'Naming Rights Holder', 'text')}
      {renderField('host_broadcaster', 'Host Broadcaster', 'text')}
    </>
  );

  const renderLeagueFields = () => (
    <>
      {renderField('name', 'League Name', 'text')}
      {renderField('sport', 'Sport', 'text')}
      {renderField('country', 'Country', 'text')}
    </>
  );

  const renderTeamFields = () => (
    <>
      {renderField('name', 'Team Name', 'text')}
      {renderField('city', 'City', 'text')}
      {renderField('state', 'State', 'text')}
      {renderField('country', 'Country', 'text')}
      {renderField('founded_year', 'Founded Year', 'number')}
    </>
  );

  return (
    <Form layout="vertical" style={{ maxWidth: 600 }}>
      {entityType === 'stadium' && renderStadiumFields()}
      {entityType === 'league' && renderLeagueFields()}
      {entityType === 'team' && renderTeamFields()}
    </Form>
  );
};

export default QuickEditForm; 