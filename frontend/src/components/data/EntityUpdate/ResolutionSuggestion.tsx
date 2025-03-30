import React from 'react';
import { Card, Row, Col, Button, Tag, Space, Typography, Tooltip } from 'antd';
import { EditOutlined, InfoCircleOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Entity, EntityType } from '../../../types/sports';
import { apiCache } from '../../../utils/apiCache';

const { Text } = Typography;

interface ResolutionSuggestionProps {
  entity: Entity;
  entityType: EntityType;
  onSelect: (entity: Entity) => void;
}

/**
 * Component for displaying entity resolution suggestions with match metadata
 */
const ResolutionSuggestion: React.FC<ResolutionSuggestionProps> = ({
  entity,
  entityType,
  onSelect
}) => {
  // Try to get resolution info from cache
  const cacheKey = `resolve_entity_${entityType}_${entity.name}`;
  const cachedResponse = apiCache.get(cacheKey);
  const resolutionInfo = cachedResponse?.resolution_info || {};
  const matchScore = resolutionInfo.match_score;
  const fuzzyMatched = resolutionInfo.fuzzy_matched;
  const contextMatched = resolutionInfo.context_matched;
  const virtualEntity = resolutionInfo.virtual_entity;

  // Calculate visual elements based on match quality
  const getMatchInfo = () => {
    if (fuzzyMatched && matchScore) {
      // Show match score as percentage
      const scorePercent = Math.round(matchScore * 100);
      const scoreColor = 
        scorePercent >= 90 ? 'green' :
        scorePercent >= 75 ? 'blue' :
        scorePercent >= 60 ? 'orange' : 'red';
        
      return (
        <Tooltip title={`${scorePercent}% match confidence for "${entity.name}"`}>
          <Tag color={scoreColor}>{scorePercent}% Match</Tag>
        </Tooltip>
      );
    } else if (contextMatched) {
      return <Tag color="purple">Context Match</Tag>;
    } else if (virtualEntity) {
      return <Tag color="cyan">Virtual Entity</Tag>;
    } else {
      return <Tag color="green"><CheckCircleFilled /> Exact Match</Tag>;
    }
  };

  // Create a formatted display for entity details
  const getEntityDetails = () => {
    const details = [];

    // Show league name if available
    if (entity.league_name) {
      details.push(
        <Text key="league">
          <Text strong>League:</Text> {entity.league_name}
        </Text>
      );
    }
    
    // Show league ID if available but not league name
    if (entity.league_id && !entity.league_name) {
      details.push(
        <Text key="league_id">
          <Text strong>League ID:</Text> {entity.league_id}
        </Text>
      );
    }
    
    // Show division/conference if available
    if (entity.division_conference_name) {
      details.push(
        <Text key="division">
          <Text strong>Division/Conference:</Text> {entity.division_conference_name}
        </Text>
      );
    }
    
    // Show location for teams/stadiums
    if (entity.location) {
      details.push(
        <Text key="location">
          <Text strong>Location:</Text> {entity.location}
        </Text>
      );
    }
    
    // Show capacity for stadiums
    if (entity.capacity) {
      details.push(
        <Text key="capacity">
          <Text strong>Capacity:</Text> {entity.capacity.toLocaleString()}
        </Text>
      );
    }
    
    // Show industry for brands
    if (entity.industry) {
      details.push(
        <Text key="industry">
          <Text strong>Industry:</Text> {entity.industry}
        </Text>
      );
    }
    
    // Show default text if no details available
    if (details.length === 0) {
      details.push(
        <Text key="id">
          <Text strong>ID:</Text> {entity.id}
        </Text>
      );
    }
    
    return details;
  };

  return (
    <Card
      hoverable
      style={{ marginBottom: 16, borderColor: fuzzyMatched ? '#f0f0f0' : '#1890ff' }}
    >
      <Row gutter={16} align="middle">
        <Col xs={24} sm={16}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="small" align="center">
              <Text strong style={{ fontSize: 16 }}>{entity.name}</Text>
              <Tag color="blue">{entityType}</Tag>
              {getMatchInfo()}
            </Space>
            <Space direction="vertical" size={0}>
              {getEntityDetails().map((detail, index) => (
                <div key={index}>{detail}</div>
              ))}
            </Space>
          </Space>
        </Col>
        <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => onSelect(entity)}
          >
            Select
          </Button>
          {' '}
          <Tooltip title="View complete entity data">
            <Button
              icon={<InfoCircleOutlined />}
              onClick={() => {
                console.log('Full entity data:', entity);
                // Could open a modal with full entity data here
              }}
            >
              Details
            </Button>
          </Tooltip>
        </Col>
      </Row>
    </Card>
  );
};

export default ResolutionSuggestion;