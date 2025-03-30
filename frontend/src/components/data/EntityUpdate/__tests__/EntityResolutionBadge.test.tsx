import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EntityResolutionBadge from '../EntityResolutionBadge';

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
    const { getByTestId } = render(<EntityResolutionBadge />);
    
    const tooltip = getByTestId('tooltip');
    const tag = getByTestId('tag-green');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Exact match');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('CheckIcon Exact');
  });

  it('renders fuzzy match badge with correct color based on score', () => {
    // High match score (green)
    const { getByTestId, unmount } = render(<EntityResolutionBadge matchScore={0.95} fuzzyMatched={true} />);
    expect(getByTestId('tag-green')).toBeInTheDocument();
    expect(getByTestId('tooltip')).toHaveAttribute('data-title', '95% match confidence');
    unmount();
    
    // Good match score (blue)
    const { getByTestId: getBlueTestId, unmount: unmountBlue } = render(<EntityResolutionBadge matchScore={0.80} fuzzyMatched={true} />);
    expect(getBlueTestId('tag-blue')).toBeInTheDocument();
    expect(getBlueTestId('tooltip')).toHaveAttribute('data-title', '80% match confidence');
    unmountBlue();
    
    // Medium match score (orange)
    const { getByTestId: getOrangeTestId, unmount: unmountOrange } = render(<EntityResolutionBadge matchScore={0.65} fuzzyMatched={true} />);
    expect(getOrangeTestId('tag-orange')).toBeInTheDocument();
    expect(getOrangeTestId('tooltip')).toHaveAttribute('data-title', '65% match confidence');
    unmountOrange();
    
    // Low match score (red)
    const { getByTestId: getRedTestId, unmount: unmountRed } = render(<EntityResolutionBadge matchScore={0.55} fuzzyMatched={true} />);
    expect(getRedTestId('tag-red')).toBeInTheDocument();
    expect(getRedTestId('tooltip')).toHaveAttribute('data-title', '55% match confidence');
    unmountRed();
  });

  it('renders context match badge', () => {
    const { getByTestId } = render(<EntityResolutionBadge contextMatched={true} />);
    
    const tooltip = getByTestId('tooltip');
    const tag = getByTestId('tag-purple');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Matched using related entity context');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('InfoIcon Context');
  });

  it('renders virtual entity badge', () => {
    const { getByTestId } = render(<EntityResolutionBadge virtualEntity={true} />);
    
    const tooltip = getByTestId('tooltip');
    const tag = getByTestId('tag-cyan');
    
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveAttribute('data-title', 'Virtual entity (not in database)');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveTextContent('Virtual');
  });

  it('includes tooltip prefix when provided', () => {
    const { getByTestId, unmount } = render(<EntityResolutionBadge tooltipPrefix="Team" />);
    
    const tooltip = getByTestId('tooltip');
    expect(tooltip).toHaveAttribute('data-title', 'Team: Exact match');
    unmount();
    
    const { getByTestId: getFuzzyTestId } = render(<EntityResolutionBadge tooltipPrefix="League" fuzzyMatched={true} matchScore={0.75} />);
    const fuzzyTooltip = getFuzzyTestId('tooltip');
    expect(fuzzyTooltip).toHaveAttribute('data-title', 'League: 75% match confidence');
  });

  it('applies small size styling when size="small"', () => {
    const { getByTestId, unmount } = render(<EntityResolutionBadge size="small" />);
    
    const tag = getByTestId('tag-green');
    expect(tag).toHaveAttribute('data-style', JSON.stringify({ fontSize: '0.8em', padding: '0 4px' }));
    unmount();
    
    // Check that regular size doesn't have the style
    const { getByTestId: getDefaultTestId } = render(<EntityResolutionBadge size="default" />);
    const defaultTag = getDefaultTestId('tag-green');
    expect(defaultTag).toHaveAttribute('data-style', JSON.stringify({}));
  });

  it('prioritizes badge types correctly', () => {
    // When multiple match types are true, it should prioritize in this order:
    // 1. fuzzyMatched (with score)
    // 2. contextMatched
    // 3. virtualEntity
    // 4. exact match (default)
    
    // Fuzzy should take precedence over context
    const { getByTestId: getFuzzyTestId, unmount: unmountFuzzy } = render(
      <EntityResolutionBadge fuzzyMatched={true} contextMatched={true} matchScore={0.8} />
    );
    expect(getFuzzyTestId('tag-blue')).toBeInTheDocument();
    expect(getFuzzyTestId('tooltip')).toHaveAttribute('data-title', '80% match confidence');
    unmountFuzzy();
    
    // Context should take precedence over virtual
    const { getByTestId: getContextTestId, unmount: unmountContext } = render(
      <EntityResolutionBadge contextMatched={true} virtualEntity={true} />
    );
    expect(getContextTestId('tag-purple')).toBeInTheDocument();
    expect(getContextTestId('tooltip')).toHaveAttribute('data-title', 'Matched using related entity context');
    unmountContext();
    
    // Virtual should take precedence over exact
    const { getByTestId: getVirtualTestId } = render(<EntityResolutionBadge virtualEntity={true} />);
    expect(getVirtualTestId('tag-cyan')).toBeInTheDocument();
    expect(getVirtualTestId('tooltip')).toHaveAttribute('data-title', 'Virtual entity (not in database)');
  });
});