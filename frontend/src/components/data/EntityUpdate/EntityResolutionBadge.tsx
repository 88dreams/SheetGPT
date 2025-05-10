import React from 'react';
import { Tag, Tooltip } from 'antd';
import { CheckCircleFilled, QuestionCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

interface EntityResolutionBadgeProps {
  matchScore?: number;
  fuzzyMatched?: boolean;
  contextMatched?: boolean;
  virtualEntity?: boolean;
  tooltipPrefix?: string;
  size?: 'small' | 'default';
}

/**
 * Component for displaying entity resolution match quality as a badge
 */
const EntityResolutionBadge: React.FC<EntityResolutionBadgeProps> = ({
  matchScore,
  fuzzyMatched,
  contextMatched,
  virtualEntity,
  tooltipPrefix = '',
  size = 'default'
}) => {
  // Handle fuzzy matched with score
  if (fuzzyMatched && matchScore) {
    const scorePercent = Math.round(matchScore * 100);
    const scoreColor = 
      scorePercent >= 90 ? 'green' :
      scorePercent >= 75 ? 'blue' :
      scorePercent >= 60 ? 'orange' : 'red';
    
    const tooltipText = `${tooltipPrefix ? `${tooltipPrefix}: ` : ''}${scorePercent}% match confidence`;
    
    return (
      <Tooltip title={tooltipText}>
        <Tag color={scoreColor} style={size === 'small' ? { fontSize: '0.8em', padding: '0 4px' } : {}}>
          {scorePercent}%
        </Tag>
      </Tooltip>
    );
  }
  
  // Handle context match
  if (contextMatched) {
    const tooltipText = `${tooltipPrefix ? `${tooltipPrefix}: ` : ''}Matched using related entity context`;
    
    return (
      <Tooltip title={tooltipText}>
        <Tag color="purple" style={size === 'small' ? { fontSize: '0.8em', padding: '0 4px' } : {}}>
          {/* @ts-expect-error TS2739: AntD icon type issue */}
          <InfoCircleOutlined /> Context
        </Tag>
      </Tooltip>
    );
  }
  
  // Handle virtual entity
  if (virtualEntity) {
    const tooltipText = `${tooltipPrefix ? `${tooltipPrefix}: ` : ''}Virtual entity (not in database)`;
    
    return (
      <Tooltip title={tooltipText}>
        <Tag color="cyan" style={size === 'small' ? { fontSize: '0.8em', padding: '0 4px' } : {}}>
          Virtual
        </Tag>
      </Tooltip>
    );
  }
  
  // Handle exact match (or unknown state)
  const tooltipText = `${tooltipPrefix ? `${tooltipPrefix}: ` : ''}Exact match`;
  
  return (
    <Tooltip title={tooltipText}>
      <Tag color="green" style={size === 'small' ? { fontSize: '0.8em', padding: '0 4px' } : {}}>
        {/* @ts-expect-error TS2739: AntD icon type issue */}
        <CheckCircleFilled /> Exact
      </Tag>
    </Tooltip>
  );
};

export default EntityResolutionBadge;