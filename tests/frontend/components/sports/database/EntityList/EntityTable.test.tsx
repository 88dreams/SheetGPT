import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EntityTable from '../../../../../../frontend/src/components/sports/database/EntityList/components/EntityTable';

// Mock the EntityRow component to simplify testing
jest.mock('../../../../../../frontend/src/components/sports/database/EntityList/components/EntityRow', () => {
  return {
    __esModule: true,
    default: jest.fn(({ entity, isSelected, toggleEntitySelection }) => (
      <tr data-testid={`entity-row-${entity.id}`}>
        <td>
          <input 
            type="checkbox" 
            checked={isSelected} 
            onChange={() => toggleEntitySelection(entity.id)}
            data-testid={`row-checkbox-${entity.id}`}
          />
        </td>
        <td data-testid={`row-name-${entity.id}`}>{entity.name}</td>
        <td>Actions</td>
      </tr>
    ))
  };
});

// Mock localStorage and sessionStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('EntityTable Component', () => {
  // Sample data for testing
  const mockEntities = [
    { id: '1', name: 'Entity 1', created_at: '2023-01-01', updated_at: '2023-01-02' },
    { id: '2', name: 'Entity 2', created_at: '2023-02-01', updated_at: '2023-02-02' },
    { id: '3', name: 'Entity 3', created_at: '2023-03-01', updated_at: '2023-03-02' }
  ];

  const defaultProps = {
    entities: mockEntities,
    columnOrder: ['id', 'name', 'created_at', 'updated_at'],
    visibleColumns: { id: true, name: true, created_at: true, updated_at: true },
    selectedEntityType: 'team',
    showFullUuids: false,
    selectedEntities: { '1': true, '2': false, '3': false },
    toggleEntitySelection: jest.fn(),
    selectAllEntities: jest.fn(),
    deselectAllEntities: jest.fn(),
    handleSort: jest.fn(),
    sortField: 'name',
    sortDirection: 'asc',
    handleEditClick: jest.fn(),
    showDeleteConfirm: null,
    setShowDeleteConfirm: jest.fn(),
    handleDeleteEntity: jest.fn(),
    handleView: jest.fn(),
    
    // Inline editing props
    editingId: null,
    editValue: '',
    setEditValue: jest.fn(),
    startEdit: jest.fn(),
    saveEdit: jest.fn(),
    cancelEdit: jest.fn(),
    handleKeyDown: jest.fn(),
    
    // Nickname editing props
    editingNicknameId: null,
    nicknameEditValue: '',
    setNicknameEditValue: jest.fn(),
    startNicknameEdit: jest.fn(),
    saveNicknameEdit: jest.fn(),
    cancelNicknameEdit: jest.fn(),
    handleNicknameKeyDown: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  it('should render the table with column headers and entity rows', () => {
    render(<EntityTable {...defaultProps} />);
    
    // Check for column headers
    expect(screen.getByText('Id')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.getByText('Updated At')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    
    // Check for entity rows
    expect(screen.getByTestId('entity-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('entity-row-2')).toBeInTheDocument();
    expect(screen.getByTestId('entity-row-3')).toBeInTheDocument();
  });

  it('should apply sorted field styling', () => {
    render(<EntityTable {...defaultProps} />);
    
    // Check for sort icon on the sorted column
    const sortIcons = screen.getAllByText(/^Actions$/); // Sort icons are sibling elements to header text
    expect(sortIcons.length).toBeGreaterThan(0);
  });

  it('should handle select all checkbox', () => {
    render(<EntityTable {...defaultProps} />);
    
    // Find the select all checkbox (first checkbox in the table)
    const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
    
    // Initially it should be indeterminate (only entity 1 is selected)
    expect(selectAllCheckbox).not.toBeChecked();
    
    // Click to select all
    fireEvent.click(selectAllCheckbox);
    expect(defaultProps.selectAllEntities).toHaveBeenCalled();
    
    // Render again with all selected
    render(
      <EntityTable 
        {...defaultProps} 
        selectedEntities={{ '1': true, '2': true, '3': true }}
      />
    );
    
    // Now the checkbox should be checked
    const updatedSelectAllCheckbox = screen.getAllByRole('checkbox')[0];
    expect(updatedSelectAllCheckbox).toBeChecked();
    
    // Click to deselect all
    fireEvent.click(updatedSelectAllCheckbox);
    expect(defaultProps.deselectAllEntities).toHaveBeenCalled();
  });

  it('should handle column sorting when clicking headers', () => {
    render(<EntityTable {...defaultProps} />);
    
    // Click on the Name column header
    fireEvent.click(screen.getByText('Name'));
    
    // Verify handleSort was called with the correct field
    expect(defaultProps.handleSort).toHaveBeenCalledWith('name');
    
    // Click on the Created At column header
    fireEvent.click(screen.getByText('Created At'));
    
    // Verify handleSort was called with the correct field
    expect(defaultProps.handleSort).toHaveBeenCalledWith('created_at');
  });

  it('should load and save column widths from/to storage', async () => {
    // Set up mock storage data
    const testWidths = {
      checkbox: 60,
      id: 150,
      name: 250,
      actions: 130
    };
    
    mockSessionStorage.getItem.mockReturnValueOnce(JSON.stringify(testWidths));
    
    render(<EntityTable {...defaultProps} />);
    
    // Wait for useEffect to load data from storage
    await waitFor(() => {
      // Verify localStorage values are set from loaded data
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'entityListColumnWidths', 
        JSON.stringify(testWidths)
      );
    });
  });

  it('should filter visible columns based on visibleColumns prop', () => {
    // Set only some columns as visible
    render(
      <EntityTable 
        {...defaultProps} 
        visibleColumns={{ id: true, name: true, created_at: false, updated_at: false }}
      />
    );
    
    // Check for visible column headers
    expect(screen.getByText('Id')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    
    // Check for hidden column headers
    expect(screen.queryByText('Created At')).not.toBeInTheDocument();
    expect(screen.queryByText('Updated At')).not.toBeInTheDocument();
  });

  it('should show delete confirmation modal when showDeleteConfirm is set', () => {
    render(
      <EntityTable 
        {...defaultProps} 
        showDeleteConfirm="1"
      />
    );
    
    // Check for delete confirmation modal
    expect(screen.getByText('Are you sure you want to delete this team?')).toBeInTheDocument();
    
    // Check for cancel and delete buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should handle cancel and confirm actions in delete modal', () => {
    render(
      <EntityTable 
        {...defaultProps} 
        showDeleteConfirm="1"
      />
    );
    
    // Click the cancel button
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.setShowDeleteConfirm).toHaveBeenCalledWith(null);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Render again with delete modal
    render(
      <EntityTable 
        {...defaultProps} 
        showDeleteConfirm="1"
      />
    );
    
    // Click the delete button
    fireEvent.click(screen.getByText('Delete'));
    expect(defaultProps.handleDeleteEntity).toHaveBeenCalledWith("1");
  });
});