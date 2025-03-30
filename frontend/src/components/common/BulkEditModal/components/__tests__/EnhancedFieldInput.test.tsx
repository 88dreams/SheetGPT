import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EnhancedFieldInput from '../../../../../../frontend/src/components/common/BulkEditModal/components/EnhancedFieldInput';

// Mock the entity resolver hook
jest.mock('../../../../../../frontend/src/hooks/useEntityResolution', () => ({
  useEntityResolution: jest.fn((entityType, nameOrId, options) => {
    // Check if we're resolving a valid entity
    if (nameOrId && nameOrId.includes('valid')) {
      return {
        entity: { 
          id: `${entityType}_123`, 
          name: nameOrId, 
          type: entityType 
        },
        isLoading: false,
        error: null,
        resolutionInfo: {
          matchScore: 0.85,
          fuzzyMatched: true,
          contextMatched: false,
          virtualEntity: false
        }
      };
    } else if (nameOrId && nameOrId.includes('context')) {
      return {
        entity: { 
          id: `${entityType}_456`, 
          name: nameOrId, 
          type: entityType 
        },
        isLoading: false,
        error: null,
        resolutionInfo: {
          matchScore: 0.9,
          fuzzyMatched: false,
          contextMatched: true,
          virtualEntity: false
        }
      };
    } else if (nameOrId && nameOrId.includes('virtual')) {
      return {
        entity: { 
          id: `${entityType}_789`, 
          name: nameOrId, 
          type: entityType 
        },
        isLoading: false,
        error: null,
        resolutionInfo: {
          matchScore: 1.0,
          fuzzyMatched: false,
          contextMatched: false,
          virtualEntity: true
        }
      };
    } else if (nameOrId && nameOrId.includes('loading')) {
      return {
        entity: null,
        isLoading: true,
        error: null,
        resolutionInfo: {}
      };
    } else if (nameOrId && nameOrId.includes('error')) {
      return {
        entity: null,
        isLoading: false,
        error: new Error('Entity not found'),
        resolutionInfo: {}
      };
    }
    
    // Default case - no match
    return {
      entity: null,
      isLoading: false,
      error: null,
      resolutionInfo: {}
    };
  })
}));

// Mock the EntityResolutionBadge component
jest.mock('../../../../../../frontend/src/components/data/EntityUpdate/EntityResolutionBadge', () => {
  return {
    __esModule: true,
    default: jest.fn(({ matchScore, fuzzyMatched, contextMatched, virtualEntity, size }) => (
      <div data-testid="resolution-badge" data-size={size}>
        {fuzzyMatched && matchScore && <div data-testid="fuzzy-match">{Math.round(matchScore * 100)}%</div>}
        {contextMatched && <div data-testid="context-match">Context</div>}
        {virtualEntity && <div data-testid="virtual-entity">Virtual</div>}
        {!fuzzyMatched && !contextMatched && !virtualEntity && <div data-testid="exact-match">Exact</div>}
      </div>
    ))
  };
});

// Mock antd components
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Input: jest.fn(({ value, onChange, placeholder, addonAfter, status, disabled }) => (
      <div data-testid="input-container" data-status={status}>
        <input
          data-testid="input"
          value={value}
          onChange={e => onChange && onChange(e)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {addonAfter && <div data-testid="input-addon">{addonAfter}</div>}
      </div>
    )),
    Select: jest.fn(({ value, onChange, placeholder, options, loading, disabled, status }) => (
      <div data-testid="select-container" data-status={status}>
        <select
          data-testid="select"
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options && options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading && <div data-testid="select-loading">Loading...</div>}
      </div>
    )),
    DatePicker: jest.fn(({ value, onChange, format, placeholder, status }) => (
      <div data-testid="date-picker" data-status={status}>
        <input
          data-testid="date-input"
          placeholder={placeholder}
          onChange={e => onChange && onChange(e.target.value, format)}
        />
      </div>
    )),
    Space: jest.fn(({ children, align }) => (
      <div data-testid={`space-${align || 'default'}`}>{children}</div>
    )),
    Form: {
      Item: jest.fn(({ label, children, help, validateStatus }) => (
        <div data-testid="form-item" data-validate-status={validateStatus}>
          <div data-testid="form-label">{label}</div>
          <div data-testid="form-control">{children}</div>
          {help && <div data-testid="form-help">{help}</div>}
        </div>
      ))
    },
    Tooltip: jest.fn(({ title, children }) => (
      <div data-testid="tooltip" data-title={title}>{children}</div>
    ))
  };
});

describe('EnhancedFieldInput', () => {
  // Sample field definitions
  const textField = { label: 'Name', type: 'string' };
  const numberField = { label: 'Score', type: 'number' };
  const relationField = { label: 'League', type: 'relation', entity_type: 'league' };
  const booleanField = { label: 'Active', type: 'boolean' };
  const dateField = { label: 'Created At', type: 'date' };
  
  // Common props
  const defaultProps = {
    field: textField,
    value: '',
    onChange: jest.fn(),
    fieldKey: 'name',
    entityType: 'team'
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders text input for string fields', () => {
    render(<EnhancedFieldInput {...defaultProps} />);
    
    expect(screen.getByTestId('form-item')).toBeInTheDocument();
    expect(screen.getByTestId('form-label')).toHaveTextContent('Name');
    expect(screen.getByTestId('input-container')).toBeInTheDocument();
    expect(screen.getByTestId('input')).toBeInTheDocument();
  });

  it('renders number input for number fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={numberField}
        fieldKey="score"
        value={10}
      />
    );
    
    expect(screen.getByTestId('form-label')).toHaveTextContent('Score');
    expect(screen.getByTestId('input')).toHaveAttribute('value', '10');
  });

  it('renders select input for boolean fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={booleanField}
        fieldKey="active"
        value={true}
      />
    );
    
    expect(screen.getByTestId('form-label')).toHaveTextContent('Active');
    expect(screen.getByTestId('select-container')).toBeInTheDocument();
  });

  it('renders date picker for date fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={dateField}
        fieldKey="created_at"
        value="2023-01-01"
      />
    );
    
    expect(screen.getByTestId('form-label')).toHaveTextContent('Created At');
    expect(screen.getByTestId('date-picker')).toBeInTheDocument();
  });

  it('renders enhanced select with resolution for relation fields', () => {
    const mockRelatedData = {
      leagues: [
        { id: 'league_123', name: 'Test League' },
        { id: 'league_456', name: 'Another League' }
      ]
    };
    
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="league_123"
        relatedEntityData={mockRelatedData}
      />
    );
    
    expect(screen.getByTestId('form-label')).toHaveTextContent('League');
    expect(screen.getByTestId('select-container')).toBeInTheDocument();
  });

  it('handles text input changes correctly', () => {
    render(<EnhancedFieldInput {...defaultProps} />);
    
    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'New Team Name' } });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('New Team Name');
  });

  it('handles select input changes correctly', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={booleanField}
        fieldKey="active"
      />
    );
    
    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: 'true' } });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('true');
  });

  it('shows fuzzy match resolution badge for relation fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="valid fuzzy league"
      />
    );
    
    // Should show resolution badge
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('fuzzy-match')).toBeInTheDocument();
    expect(screen.getByTestId('fuzzy-match')).toHaveTextContent('85%');
  });

  it('shows context match resolution badge for relation fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="context league"
      />
    );
    
    // Should show resolution badge
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('context-match')).toBeInTheDocument();
  });

  it('shows virtual entity resolution badge for relation fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="virtual league"
      />
    );
    
    // Should show resolution badge
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('virtual-entity')).toBeInTheDocument();
  });

  it('shows loading state for resolving relation fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="loading league"
      />
    );
    
    // Should show loading indicator
    expect(screen.getByTestId('select-container')).toBeInTheDocument();
  });

  it('shows error state for failed resolution of relation fields', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="error league"
      />
    );
    
    // Should show error state
    expect(screen.getByTestId('form-item')).toHaveAttribute('data-validate-status', 'error');
    expect(screen.getByTestId('form-help')).toHaveTextContent('Entity not found');
  });

  it('passes context data to entity resolution hook for better matching', () => {
    const context = { team_id: 'team_123', division_id: 'div_456' };
    
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="context league"
        context={context}
      />
    );
    
    // The hook should receive the context from props
    const { useEntityResolution } = require('../../../../../../frontend/src/hooks/useEntityResolution');
    expect(useEntityResolution).toHaveBeenCalledWith(
      'league', 
      'context league', 
      expect.objectContaining({ 
        context
      })
    );
  });

  it('uses appropriate options from relatedEntityData for selects', () => {
    const mockRelatedData = {
      leagues: [
        { id: 'league_123', name: 'Test League' },
        { id: 'league_456', name: 'Another League' }
      ]
    };
    
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        relatedEntityData={mockRelatedData}
      />
    );
    
    // Check that options are populated from related data
    const select = screen.getByTestId('select');
    expect(select.children.length).toBeGreaterThan(1); // At least placeholder + options
  });

  it('handles null or empty values gracefully', () => {
    // Test with null value
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        value={null}
      />
    );
    
    expect(screen.getByTestId('input')).toHaveAttribute('value', '');
    
    // Test with undefined value
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        value={undefined}
      />
    );
    
    expect(screen.getByTestId('input')).toHaveAttribute('value', '');
  });

  it('applies small size to resolution badge', () => {
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={relationField}
        fieldKey="league_id"
        value="valid fuzzy league"
      />
    );
    
    // Badge should have small size
    expect(screen.getByTestId('resolution-badge')).toHaveAttribute('data-size', 'small');
  });

  it('includes help text in tooltip for fields with help property', () => {
    const fieldWithHelp = { 
      ...relationField, 
      help: 'Select the league this team belongs to' 
    };
    
    render(
      <EnhancedFieldInput 
        {...defaultProps} 
        field={fieldWithHelp}
        fieldKey="league_id"
      />
    );
    
    // Should show tooltip with help text
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toHaveAttribute('data-title', 'Select the league this team belongs to');
  });
});