import React, { useState, useEffect } from 'react';
import { Form, Input, Select, InputNumber, Typography, Space, Collapse, Timeline, Tag } from 'antd';
import { EditOutlined, HistoryOutlined, LinkOutlined, LockOutlined } from '@ant-design/icons';
import { Entity, EntityType, Team, Stadium, League } from '../../../types/sports';
import { useApiClient } from '../../../hooks/useApiClient';

const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface ChangeHistoryItem {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}

interface AdvancedEditFormProps {
  entity: Entity;
  entityType: EntityType;
  isEditing: boolean;
  onChange: (updatedEntity: Entity) => void;
}

interface RelatedEntity {
  id: string;
  name: string;
  type: string;
  relationship: string;
}

export const AdvancedEditForm: React.FC<AdvancedEditFormProps> = ({
  entity,
  entityType,
  isEditing,
  onChange,
}) => {
  const [relatedEntities, setRelatedEntities] = useState<RelatedEntity[]>([]);
  const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const apiClient = useApiClient();

  const handleFieldChange = (field: string, value: string | number) => {
    onChange({
      ...entity,
      [field]: value,
    });
  };

  useEffect(() => {
    const loadRelatedData = async () => {
      if (entityType === 'team') {
        try {
          const [leaguesResponse, stadiumsResponse] = await Promise.all([
            apiClient.get('/api/v1/leagues'),
            apiClient.get('/api/v1/stadiums')
          ]);
          setLeagues(leaguesResponse.data.items || []);
          setStadiums(stadiumsResponse.data.items || []);
        } catch (error) {
          console.error('Error loading related data:', error);
        }
      }
    };
    loadRelatedData();
  }, [entityType]);

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange(field, e.target.value)}
            disabled={!isEditing}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        )}
        {type === 'number' && (
          <InputNumber
            value={value as number}
            onChange={(val: number | null) => val !== null && handleFieldChange(field, val)}
            disabled={!isEditing}
            placeholder={`Enter ${label.toLowerCase()}`}
            style={{ width: '100%' }}
          />
        )}
        {type === 'select' && options && (
          <Select
            value={value as string}
            onChange={(val: string) => handleFieldChange(field, val)}
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

  const renderTeamFields = () => {
    const teamEntity = entity as Team;
    return (
      <>
        {renderField('name', 'Team Name', 'text')}
        {renderField('city', 'City', 'text')}
        {renderField('state', 'State', 'text')}
        {renderField('country', 'Country', 'text')}
        {renderField('founded_year', 'Founded Year', 'number')}
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
            value={teamEntity.league_id}
            onChange={(val: string) => handleFieldChange('league_id', val)}
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
            value={teamEntity.stadium_id}
            onChange={(val: string) => handleFieldChange('stadium_id', val)}
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

  const loadRelatedEntities = async () => {
    try {
      if (entityType === 'stadium') {
        const response = await apiClient.get(`/api/v1/teams`, {
          params: {
            filters: JSON.stringify([{
              field: 'stadium_id',
              operator: 'eq',
              value: entity.id
            }])
          }
        });
        setRelatedEntities(response.data.items.map((team: any) => ({
          id: team.id,
          name: team.name,
          type: 'team',
          relationship: 'Home Stadium'
        })));
      }
    } catch (error) {
      console.error('Error loading related entities:', error);
    }
  };

  const loadChangeHistory = async () => {
    try {
      const response = await apiClient.get(`/api/v1/${entityType}s/${entity.id}/history`);
      if (response.data && Array.isArray(response.data)) {
        setChangeHistory(response.data);
      } else {
        setChangeHistory([]);
      }
    } catch (error) {
      console.error('Error loading change history:', error);
      setChangeHistory([]);
    }
  };

  React.useEffect(() => {
    loadRelatedEntities();
    loadChangeHistory();
  }, [entity.id]);

  const renderRelatedEntities = () => (
    <Panel header="Related Entities" key="related">
      {relatedEntities.map((related) => (
        <div key={related.id} style={{ marginBottom: 8 }}>
          <Tag color="blue">{related.type}</Tag>
          <Text>{related.name}</Text>
          <Text type="secondary"> - {related.relationship}</Text>
        </div>
      ))}
    </Panel>
  );

  const renderChangeHistory = () => {
    if (!changeHistory || changeHistory.length === 0) {
      return (
        <Panel header="Change History" key="history">
          <Text type="secondary">No change history available</Text>
        </Panel>
      );
    }

    return (
      <Panel header="Change History" key="history">
        <Timeline>
          {changeHistory.map((change, index) => (
            <Timeline.Item key={index}>
              <Text strong>{change.field}</Text>
              <br />
              <Text type="secondary">
                Changed from "{change.oldValue || ''}" to "{change.newValue || ''}"
              </Text>
              <br />
              <Text type="secondary">
                {change.timestamp ? new Date(change.timestamp).toLocaleString() : ''}
              </Text>
            </Timeline.Item>
          ))}
        </Timeline>
      </Panel>
    );
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Form layout="vertical" style={{ maxWidth: 600 }}>
        {entityType === 'stadium' && renderStadiumFields()}
        {entityType === 'league' && renderLeagueFields()}
        {entityType === 'team' && renderTeamFields()}
      </Form>
      
      <Collapse defaultActiveKey={['related', 'history']}>
        {renderRelatedEntities()}
        {renderChangeHistory()}
      </Collapse>
    </Space>
  );
};

export default AdvancedEditForm; 