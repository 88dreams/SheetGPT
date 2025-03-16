import React from 'react';
import { Collapse, Timeline, Typography, Tag, Spin } from 'antd';
import { useEntityRelationships } from './hooks/useEntityData';
import { Entity, EntityType } from '../../../types/sports';

const { Panel } = Collapse;
const { Text } = Typography;

interface EntityRelatedInfoProps {
  entity: Entity;
  entityType: EntityType;
}

/**
 * Component that displays related entities and change history
 */
const EntityRelatedInfo: React.FC<EntityRelatedInfoProps> = ({ entity, entityType }) => {
  const { relatedEntities, changeHistory, isLoading } = useEntityRelationships(entityType, entity.id);

  if (isLoading) {
    return <Spin size="small" />;
  }

  const renderRelatedEntities = () => (
    <Panel header="Related Entities" key="related">
      {relatedEntities.length === 0 ? (
        <Text type="secondary">No related entities</Text>
      ) : (
        relatedEntities.map((related) => (
          <div key={related.id} style={{ marginBottom: 8 }}>
            <Tag color="blue">{related.type}</Tag>
            <Text>{related.name}</Text>
            <Text type="secondary"> - {related.relationship}</Text>
          </div>
        ))
      )}
    </Panel>
  );

  const renderChangeHistory = () => (
    <Panel header="Change History" key="history">
      {changeHistory.length === 0 ? (
        <Text type="secondary">No change history available</Text>
      ) : (
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
      )}
    </Panel>
  );

  return (
    <Collapse defaultActiveKey={['related', 'history']}>
      {renderRelatedEntities()}
      {renderChangeHistory()}
    </Collapse>
  );
};

export default EntityRelatedInfo;