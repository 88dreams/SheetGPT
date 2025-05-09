import React from 'react';
import { Card, Row, Col, Button, Tag, Space, Typography, Tooltip } from 'antd';
import { EditOutlined, InfoCircleOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Entity, EntityType, Stadium, League, DivisionConference, Team, Brand } from '../../../types/sports';
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
    const currentEntity = entity as any; // Keep as any for broader initial access, narrow down below

    // Show league name if available on specific types
    if ((entityType === 'division_conference' || entityType === 'team') && 'league_name' in entity && entity.league_name) {
      details.push(
        <Text key="league_name">
          <Text strong>League:</Text> {(entity as DivisionConference | Team).league_name}
        </Text>
      );
    }

    // Show league ID if available on specific types (and name wasn't shown for that type)
    if (
      (entityType === 'division_conference' || entityType === 'team' || entityType === 'game' || entityType === 'league_executive') &&
      'league_id' in entity &&
      entity.league_id &&
      !((entityType === 'division_conference' || entityType === 'team') && 'league_name' in entity && entity.league_name)
    ) {
      details.push(
        <Text key="league_id">
          <Text strong>League ID:</Text> {(entity as DivisionConference | Team /* | Game | LeagueExecutive */).league_id}
        </Text>
      );
    }
    
    // Show division/conference if available
    if (entityType === 'team' && 'division_conference_name' in entity && entity.division_conference_name) {
      details.push(
        <Text key="division">
          <Text strong>Division/Conference:</Text> {(entity as Team).division_conference_name}
        </Text>
      );
    }
    
    // Show location for teams/stadiums
    if ((entityType === 'stadium' || entityType === 'team')) {
      const locEntity = entity as Stadium | Team;
      if (locEntity.city && locEntity.country) {
        const locationString = `${locEntity.city}${locEntity.state ? `, ${locEntity.state}` : ''}, ${locEntity.country}`;
        details.push(
          <Text key="location">
            <Text strong>Location:</Text> {locationString}
          </Text>
        );
      }
    }
    
    // Show capacity for stadiums
    if (entityType === 'stadium' && 'capacity' in entity && entity.capacity !== undefined && entity.capacity !== null) {
      details.push(
        <Text key="capacity">
          <Text strong>Capacity:</Text> {(entity as Stadium).capacity?.toLocaleString()}
        </Text>
      );
    }
    
    // Show industry for brands
    if (entityType === 'brand' && 'industry' in entity && entity.industry) {
      details.push(
        <Text key="industry">
          <Text strong>Industry:</Text> {(entity as Brand).industry}
        </Text>
      );
    }
    
    // Show sport for leagues
    if (entityType === 'league' && 'sport' in entity && entity.sport) {
      details.push(
        <Text key="sport">
          <Text strong>Sport:</Text> {(entity as League).sport}
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