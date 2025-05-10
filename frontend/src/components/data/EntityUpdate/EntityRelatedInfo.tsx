import React, { useState } from 'react';
import { Collapse, Timeline, Typography, Tag, Spin, Space, Button, Tooltip, Modal } from 'antd';
import { InfoCircleOutlined, LinkOutlined, HistoryOutlined } from '@ant-design/icons';
import { useEntityRelationships } from './hooks/useEntityData';
import { Entity, EntityType } from '../../../types/sports';
import EntityResolutionBadge from './EntityResolutionBadge';
import { apiCache } from '../../../utils/apiCache';
import ResolutionSuggestion from './ResolutionSuggestion';

const { Panel } = Collapse;
const { Text, Title } = Typography;

interface EntityRelatedInfoProps {
  entity: Entity;
  entityType: EntityType;
  onEntitySelect?: (entity: Entity) => void;
}

/**
 * Enhanced component that displays related entities and change history with resolution metadata
 */
const EntityRelatedInfo: React.FC<EntityRelatedInfoProps> = ({ 
  entity, 
  entityType,
  onEntitySelect 
}) => {
  const { relatedEntities, changeHistory, isLoading } = useEntityRelationships(entityType, entity.id);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedRelatedEntity, setSelectedRelatedEntity] = useState<any>(null);

  if (isLoading) {
    return <Spin size="small" />;
  }

  // Check for resolution info in the cache
  const getResolutionInfo = (related: any) => {
    const cacheKey = `resolve_entity_${related.type}_${related.name}`;
    const cachedResponse = apiCache.get(cacheKey);
    const resolutionInfo = cachedResponse?.resolution_info || {};
    
    return {
      matchScore: resolutionInfo.match_score,
      fuzzyMatched: resolutionInfo.fuzzy_matched,
      contextMatched: resolutionInfo.context_matched,
      virtualEntity: resolutionInfo.virtual_entity
    };
  };

  // Open details modal for a related entity
  const handleViewDetails = (related: any) => {
    setSelectedRelatedEntity(related);
    setDetailsModalVisible(true);
  };

  // Handle selecting a related entity for editing
  const handleSelectEntity = (related: any) => {
    if (onEntitySelect) {
      onEntitySelect(related);
    }
    setDetailsModalVisible(false);
  };

  const renderRelatedEntities = () => (
    <Panel 
      header={
        <Space>
          <span>Related Entities</span>
          <Tag>{relatedEntities.length}</Tag>
        </Space>
      } 
      key="related"
      extra={
        <Tooltip title="Entities related to this record through references or relationships">
          {/* @ts-expect-error TS2739: AntD icon type issue */}
          <InfoCircleOutlined />
        </Tooltip>
      }
    >
      {relatedEntities.length === 0 ? (
        <Text type="secondary">No related entities</Text>
      ) : (
        relatedEntities.map((related) => {
          const resolutionInfo = getResolutionInfo(related);
          
          return (
            <div key={related.id} style={{ marginBottom: 12, padding: 8, borderBottom: '1px solid #f0f0f0' }}>
              <Space wrap>
                <Tag color="blue">{related.type}</Tag>
                <Text strong>{related.name}</Text>
                <EntityResolutionBadge 
                  matchScore={resolutionInfo.matchScore}
                  fuzzyMatched={resolutionInfo.fuzzyMatched}
                  contextMatched={resolutionInfo.contextMatched}
                  virtualEntity={resolutionInfo.virtualEntity}
                  tooltipPrefix="Entity resolution"
                  size="small"
                />
                <Text type="secondary">{related.relationship}</Text>
                <Space size="small">
                  <Button 
                    type="text" 
                    size="small" 
                    // @ts-expect-error TS2739: AntD icon type issue
                    icon={<InfoCircleOutlined />}
                    onClick={() => handleViewDetails(related)}
                  />
                  {onEntitySelect && (
                    <Button 
                      type="text" 
                      size="small" 
                      // @ts-expect-error TS2739: AntD icon type issue
                      icon={<LinkOutlined />}
                      onClick={() => onEntitySelect(related)}
                    />
                  )}
                </Space>
              </Space>
            </div>
          );
        })
      )}
    </Panel>
  );

  const renderChangeHistory = () => (
    <Panel 
      header={
        <Space>
          <span>Change History</span>
          <Tag>{changeHistory.length}</Tag>
        </Space>
      } 
      key="history"
      extra={
        <Tooltip title="History of changes made to this entity">
          {/* @ts-expect-error TS2739: AntD icon type issue */}
          <HistoryOutlined />
        </Tooltip>
      }
    >
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

  // Render the details modal for a related entity
  const renderDetailsModal = () => {
    if (!selectedRelatedEntity) return null;
    
    return (
      <Modal
        title={`${selectedRelatedEntity.type}: ${selectedRelatedEntity.name}`}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
          onEntitySelect && (
            <Button 
              key="select" 
              type="primary" 
              onClick={() => handleSelectEntity(selectedRelatedEntity)}
            >
              Edit This Entity
            </Button>
          )
        ]}
        width={600}
      >
        <ResolutionSuggestion
          entity={selectedRelatedEntity}
          entityType={selectedRelatedEntity.type}
          onSelect={handleSelectEntity}
        />
        
        <Collapse defaultActiveKey={['details']} style={{ marginTop: 16 }}>
          <Panel header="Complete Entity Data" key="details">
            <pre style={{ maxHeight: 300, overflow: 'auto' }}>
              {JSON.stringify(selectedRelatedEntity, null, 2)}
            </pre>
          </Panel>
        </Collapse>
      </Modal>
    );
  };

  return (
    <>
      <Collapse defaultActiveKey={['related', 'history']}>
        {renderRelatedEntities()}
        {renderChangeHistory()}
      </Collapse>
      
      {renderDetailsModal()}
    </>
  );
};

export default EntityRelatedInfo;