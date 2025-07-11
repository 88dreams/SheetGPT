import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

import EnhancedBulkEditModal from '../EnhancedBulkEditModal';

// Mock the child components
jest.mock('../../../../../frontend/src/components/common/BulkEditModal/components/FieldSelector', () => {
  return {
    __esModule: true,
    default: jest.fn(({ fields, selectedFields, onFieldToggle }) => (
      <div data-testid="field-selector">
        {Object.keys(fields).map(fieldKey => (
          <div key={fieldKey} data-testid={`field-${fieldKey}`}>
            <input
              type="checkbox"
              checked={selectedFields.includes(fieldKey)}
              onChange={() => onFieldToggle(fieldKey)}
              data-testid={`field-checkbox-${fieldKey}`}
            />
            <span>{fields[fieldKey].label}</span>
          </div>
        ))}
      </div>
    ))
  };
});

jest.mock('../../../../../frontend/src/components/common/BulkEditModal/components/EnhancedFieldInput', () => {
  return {
    __esModule: true,
    default: jest.fn(({ field, value, onChange, entityType, fieldKey, context, relatedEntityData }) => (
      <div data-testid={`field-input-${fieldKey}`} data-entity-type={entityType}>
        <label>{field.label}</label>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          data-testid={`input-${fieldKey}`}
          data-context={JSON.stringify(context)}
          data-related-data={JSON.stringify(relatedEntityData)}
        />
      </div>
    ))
  };
});

jest.mock('../../../../../frontend/src/components/common/BulkEditModal/components/ProcessingStatus', () => {
  return {
    __esModule: true,
    default: jest.fn(({ isProcessing, processed, total, errors }) => (
      <div data-testid="processing-status">
        <div data-testid="status-processing">{isProcessing ? 'Processing...' : 'Idle'}</div>
        <div data-testid="status-progress">{processed}/{total}</div>
        <div data-testid="status-errors">{errors}</div>
      </div>
    ))
  };
});

// Mock the hooks
jest.mock('../../../../../frontend/src/components/common/BulkEditModal/hooks/useFieldDetection', () => ({
  useFieldDetection: jest.fn(() => ({
    entityFields: {
      name: { label: 'Name', type: 'string' },
      description: { label: 'Description', type: 'string' },
      league_id: { label: 'League', type: 'relation', entity_type: 'league' },
      stadium_id: { label: 'Stadium', type: 'relation', entity_type: 'stadium' },
      division_conference_id: { label: 'Division/Conference', type: 'relation', entity_type: 'division_conference' }
    },
    fieldCategories: {
      'Basic Info': ['name', 'description'],
      'Relationships': ['league_id', 'stadium_id', 'division_conference_id']
    }
  }))
}));

jest.mock('../../../../../frontend/src/components/common/BulkEditModal/hooks/useFieldManagement', () => ({
  useFieldManagement: jest.fn(() => ({
    selectedFields: ['name', 'league_id'],
    fieldValues: { name: 'Test Name', league_id: 'league_123' },
    toggleField: jest.fn(),
    setFieldValue: jest.fn((field: string, value: any) => {}),
    resetFields: jest.fn()
  }))
}));

jest.mock('../../../../../frontend/src/components/common/BulkEditModal/hooks/useBulkUpdate', () => ({
  useBulkUpdate: jest.fn(() => ({
    updateEntities: jest.fn<() => Promise<{ success: number; failed: number; total: number; }>>().mockResolvedValue({
      success: 5,
      failed: 1,
      total: 6
    }),
    isProcessing: false,
    processed: 0,
    total: 0,
    errors: 0,
    resetStatus: jest.fn()
  }))
}));

jest.mock('../../../../../frontend/src/components/common/BulkEditModal/hooks/useRelationships', () => ({
  useRelationships: jest.fn(() => ({
    relatedEntityData: {
      leagues: [
        { id: 'league_123', name: 'Test League' },
        { id: 'league_456', name: 'Another League' }
      ],
      division_conferences: [
        { id: 'div_123', name: 'Test Division', league_id: 'league_123' },
        { id: 'div_456', name: 'Another Division', league_id: 'league_456' }
      ],
      stadiums: [
        { id: 'stadium_123', name: 'Test Stadium' },
        { id: 'stadium_456', name: 'Another Stadium' }
      ]
    },
    isLoading: false,
    fetchRelatedEntities: jest.fn()
  }))
}));

jest.mock('../../../../../frontend/src/hooks/useEntityResolution', () => ({
  useBatchEntityResolution: jest.fn(() => ({
    resolved: {
      league: { id: 'league_123', name: 'Test League' },
      division: { id: 'div_123', name: 'Test Division', league_id: 'league_123' }
    },
    errors: {},
    isLoading: false
  }))
}));

// Mock antd components
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return Object.assign({}, actual, {
    Modal: jest.fn(({ title, open, onCancel, onOk, confirmLoading, children, footer, width }: any) => (
      <div 
        data-testid="modal" 
        data-open={String(open)}
        data-title={title as string}
        data-width={width}
      >
        <div data-testid="modal-content">{children}</div>
        <div data-testid="modal-footer">
          {footer || (
            <>
              <button 
                data-testid="modal-cancel"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button 
                data-testid="modal-ok"
                onClick={onOk}
                disabled={confirmLoading || false}
              >
                {confirmLoading ? 'Loading...' : 'OK'}
              </button>
            </>
          )}
        </div>
      </div>
    )),
    Button: jest.fn(({ children }: any) => <button>{children}</button>),
    Tabs: jest.fn(({ children }: any) => <div>{children}</div>),
    Collapse: jest.fn(({ children }: any) => <div>{children}</div>),
    Space: jest.fn(({ children }: any) => <div>{children}</div>),
    Row: jest.fn(({ children }: any) => <div>{children}</div>),
    Col: jest.fn(({ children }: any) => <div>{children}</div>),
    message: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    },
    Typography: {
      Title: jest.fn(({ children }: any) => <h1>{children}</h1>),
      Text: jest.fn(({ children }: any) => <span>{children}</span>)
    }
  });
});

describe('EnhancedBulkEditModal', () => {
  const mockSelectedEntities = { 
    'team_1': true,
    'team_2': true,
    'team_3': true
  };
  
  const defaultProps = {
    open: true,
    entityType: 'team' as any,
    selectedIds: Object.keys(mockSelectedEntities),
    onCancel: jest.fn(),
    onSuccess: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Modal should be visible
    expect(screen.getByTestId('modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByTestId('modal')).toHaveAttribute('data-title', 'Bulk Edit Teams');
    
    // Should have tabs for field selection and values
    expect(screen.getByTestId('tabs')).toBeInTheDocument();
    expect(screen.getByTestId('tab-fields')).toBeInTheDocument();
    expect(screen.getByTestId('tab-values')).toBeInTheDocument();
    
    // Field selector should be visible initially
    expect(screen.getByTestId('field-selector')).toBeInTheDocument();
    
    // Check initial state
    expect(screen.getByTestId('tab-fields')).toHaveAttribute('data-active', 'true');
  });

  it('displays field selector with categorized fields', () => {
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Field selector should show all fields from categories
    expect(screen.getByTestId('field-name')).toBeInTheDocument();
    expect(screen.getByTestId('field-description')).toBeInTheDocument();
    expect(screen.getByTestId('field-league_id')).toBeInTheDocument();
    expect(screen.getByTestId('field-stadium_id')).toBeInTheDocument();
    expect(screen.getByTestId('field-division_conference_id')).toBeInTheDocument();
    
    // Selected fields should be checked
    expect(screen.getByTestId('field-checkbox-name')).toBeChecked();
    expect(screen.getByTestId('field-checkbox-league_id')).toBeChecked();
  });

  it('allows toggling fields', () => {
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Check initial state
    expect(screen.getByTestId('field-checkbox-name')).toBeChecked();
    expect(screen.getByTestId('field-checkbox-description')).not.toBeChecked();
    
    // Toggle description field
    fireEvent.click(screen.getByTestId('field-checkbox-description'));
    
    // Field should now be selected
    expect(screen.getByTestId('field-checkbox-description')).toBeChecked();
    
    // Toggle name field off
    fireEvent.click(screen.getByTestId('field-checkbox-name'));
    
    // Field should now be unselected
    expect(screen.getByTestId('field-checkbox-name')).not.toBeChecked();
  });

  it('switches to values tab and shows selected field inputs', () => {
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Click on Values tab
    fireEvent.click(screen.getByTestId('tab-values'));
    
    // Values tab should be active
    expect(screen.getByTestId('tab-values')).toHaveAttribute('data-active', 'true');
    
    // Should show inputs for selected fields
    expect(screen.getByTestId('field-input-name')).toBeInTheDocument();
    expect(screen.getByTestId('field-input-league_id')).toBeInTheDocument();
    
    // Should not show inputs for unselected fields
    expect(screen.queryByTestId('field-input-description')).not.toBeInTheDocument();
  });

  it('handles input changes for field values', () => {
    const { useFieldManagement } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useFieldManagement');
    
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Switch to values tab
    fireEvent.click(screen.getByTestId('tab-values'));
    
    // Change name value
    fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'New Team Name' } });
    
    // Change league_id value
    fireEvent.change(screen.getByTestId('input-league_id'), { target: { value: 'league_456' } });
    
    // Check if setFieldValue was called with correct values
    expect(useFieldManagement().setFieldValue).toHaveBeenCalledWith('name', 'New Team Name');
    expect(useFieldManagement().setFieldValue).toHaveBeenCalledWith('league_id', 'league_456');
  });

  it('processes the bulk update when submitted', async () => {
    const { useBulkUpdate } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useBulkUpdate');
    const { message } = require('antd');
    
    const mockUpdateEntities = jest.fn<() => Promise<{ success: number; failed: number; total: number; }>>().mockResolvedValue({
      success: 5,
      failed: 1,
      total: 6
    });
    
    (useBulkUpdate as jest.Mock).mockImplementation(() => ({
      updateEntities: mockUpdateEntities,
      isProcessing: false,
      processed: 0,
      total: 0,
      errors: 0,
      resetStatus: jest.fn()
    }));
    
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Submit the form
    fireEvent.click(screen.getByTestId('modal-ok'));
    
    // Should call updateEntities with correct params
    expect(mockUpdateEntities).toHaveBeenCalledWith(
      'team',
      mockSelectedEntities,
      { name: 'Test Name', league_id: 'league_123' }
    );
    
    // Wait for update to complete
    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Updated 5 of 6 teams successfully');
    });
    
    // Should call onSuccess callback
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('shows processing status during update', async () => {
    const { useBulkUpdate } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useBulkUpdate');
    
    (useBulkUpdate as jest.Mock).mockImplementation(() => ({
      updateEntities: jest.fn<() => Promise<{ success: number; failed: number; total: number; }>>().mockResolvedValue({ success: 3, failed: 0, total: 3 }),
      isProcessing: true,
      processed: 2,
      total: 3,
      errors: 0,
      resetStatus: jest.fn()
    }));
    
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Processing status should show current progress
    expect(screen.getByTestId('processing-status')).toBeInTheDocument();
    expect(screen.getByTestId('status-processing')).toHaveTextContent('Processing...');
    expect(screen.getByTestId('status-progress')).toHaveTextContent('2/3');
    expect(screen.getByTestId('status-errors')).toHaveTextContent('0');
    
    // OK button should be disabled during processing
    expect(screen.getByTestId('modal-ok')).toBeDisabled();
  });

  it('passes context data to EnhancedFieldInput for relationship fields', () => {
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Switch to values tab
    fireEvent.click(screen.getByTestId('tab-values'));
    
    // Check if league_id field has entity_type and related data
    const leagueInput = screen.getByTestId('field-input-league_id');
    expect(leagueInput).toHaveAttribute('data-entity-type', 'team');
    
    // Verify context is passed
    const contextData = JSON.parse(leagueInput.getAttribute('data-context') || '{}');
    expect(contextData).toBeDefined();
    
    // Verify related entity data is passed
    const relatedData = JSON.parse(leagueInput.getAttribute('data-related-data') || '{}');
    expect(relatedData).toBeDefined();
    expect(relatedData.leagues).toBeDefined();
  });

  it('handles cancel action correctly', () => {
    const { useFieldManagement } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useFieldManagement');
    const { useBulkUpdate } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useBulkUpdate');
    
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Click cancel button
    fireEvent.click(screen.getByTestId('modal-cancel'));
    
    // Should reset fields and status
    expect(useFieldManagement().resetFields).toHaveBeenCalled();
    expect(useBulkUpdate().resetStatus).toHaveBeenCalled();
    
    // Should call onCancel prop
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('handles errors during update', async () => {
    const { useBulkUpdate } = require('../../../../../frontend/src/components/common/BulkEditModal/hooks/useBulkUpdate');
    const { message } = require('antd');
    const mockUpdateError = new Error('Update failed');
    const mockUpdateEntities = jest.fn<() => Promise<never>>().mockRejectedValue(mockUpdateError);
    
    (useBulkUpdate as jest.Mock).mockImplementation(() => ({
      updateEntities: mockUpdateEntities,
      isProcessing: false,
      processed: 0,
      total: 0,
      errors: 0,
      resetStatus: jest.fn()
    }));
    
    // Mock console.error to prevent test output noise
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    render(<EnhancedBulkEditModal {...defaultProps} />);
    
    // Submit the form
    fireEvent.click(screen.getByTestId('modal-ok'));
    
    // Wait for error handling
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Failed to update teams: Update failed');
      expect(console.error).toHaveBeenCalledWith('Bulk update error:', mockUpdateError);
    });
    
    // Should not call onSuccess on error
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});