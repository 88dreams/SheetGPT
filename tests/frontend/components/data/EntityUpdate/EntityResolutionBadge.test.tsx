import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EntityResolutionBadge from '../../../../../frontend/src/components/data/EntityUpdate/EntityResolutionBadge';

// Mock antd components
jest.mock('antd', () => ({
  Tag: jest.fn(({ color, children, style }) => (
    <span data-testid={`tag-${color}`} data-style={JSON.stringify(style)}>{children}</span>
  )),
  Tooltip: jest.fn(({ title, children }) => (
    <div data-testid="tooltip" data-title={title}>{children}</div>
  ))
}));

// Mock icons
jest.mock('@ant-design/icons', () => ({
  CheckCircleFilled: () => <span data-testid="check-icon">CheckIcon</span>,
  InfoCircleOutlined: () => <span data-testid="info-icon">InfoIcon</span>,
  QuestionCircleOutlined: () => <span data-testid="question-icon">QuestionIcon</span>
}));

describe('EntityResolutionBadge', () => {
  it('renders exact match badge by default', () => {
    render(<EntityResolutionBadge />);
    
    const tooltip = screen.getByTestId('tooltip');
    const tag = screen.getByTestId('tag-green');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Exact match');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('CheckIcon Exact');
  });

  it('renders fuzzy match badge with correct color based on score', () => {
    // High match score (green)
    render(<EntityResolutionBadge matchScore={0.95} fuzzyMatched={true} />);
    expect(screen.getByTestId('tag-green')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', '95% match confidence');
    
    // Good match score (blue)
    render(<EntityResolutionBadge matchScore={0.80} fuzzyMatched={true} />);
    expect(screen.getByTestId('tag-blue')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', '80% match confidence');
    
    // Medium match score (orange)
    render(<EntityResolutionBadge matchScore={0.65} fuzzyMatched={true} />);
    expect(screen.getByTestId('tag-orange')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', '65% match confidence');
    
    // Low match score (red)
    render(<EntityResolutionBadge matchScore={0.55} fuzzyMatched={true} />);
    expect(screen.getByTestId('tag-red')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', '55% match confidence');
  });

  it('renders context match badge', () => {
    render(<EntityResolutionBadge contextMatched={true} />);
    
    const tooltip = screen.getByTestId('tooltip');
    const tag = screen.getByTestId('tag-purple');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Matched using related entity context');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('InfoIcon Context');
  });

  it('renders virtual entity badge', () => {
    render(<EntityResolutionBadge virtualEntity={true} />);
    
    const tooltip = screen.getByTestId('tooltip');
    const tag = screen.getByTestId('tag-cyan');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Virtual entity (not in database)');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('Virtual');
  });

  it('includes tooltip prefix when provided', () => {
    render(<EntityResolutionBadge tooltipPrefix="Team" />);
    
    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-title', 'Team: Exact match');
    
    render(<EntityResolutionBadge tooltipPrefix="League" fuzzyMatched={true} matchScore={0.75} />);
    const fuzzyTooltip = screen.getByTestId('tooltip');
    expect(fuzzyTooltip).toHaveAttribute('data-title', 'League: 75% match confidence');
  });

  it('applies small size styling when size="small"', () => {
    render(<EntityResolutionBadge size="small" />);
    
    const tag = screen.getByTestId('tag-green');
    expect(tag).toHaveAttribute('data-style', JSON.stringify({ fontSize: '0.8em', padding: '0 4px' }));
    
    // Check that regular size doesn't have the style
    render(<EntityResolutionBadge size="default" />);
    const defaultTag = screen.getByTestId('tag-green');
    expect(defaultTag).toHaveAttribute('data-style', JSON.stringify({}));
  });

  it('prioritizes badge types correctly', () => {
    // When multiple match types are true, it should prioritize in this order:
    // 1. fuzzyMatched (with score)
    // 2. contextMatched
    // 3. virtualEntity
    // 4. exact match (default)
    
    // Fuzzy should take precedence over context
    render(<EntityResolutionBadge fuzzyMatched={true} contextMatched={true} matchScore={0.8} />);
    expect(screen.getByTestId('tag-blue')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', '80% match confidence');
    
    // Context should take precedence over virtual
    render(<EntityResolutionBadge contextMatched={true} virtualEntity={true} />);
    expect(screen.getByTestId('tag-purple')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Matched using related entity context');
    
    // Virtual should take precedence over exact
    render(<EntityResolutionBadge virtualEntity={true} />);
    expect(screen.getByTestId('tag-cyan')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Virtual entity (not in database)');
  });
});