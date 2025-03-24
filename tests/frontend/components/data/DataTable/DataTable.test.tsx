import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import DataTable from '../../../../../frontend/src/components/data/DataTable';

// Mock dependencies
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQuery: jest.fn(),
  };
});

jest.mock('../../../../../frontend/src/utils/api', () => ({
  data: {
    getStructuredDataById: jest.fn(),
    getRows: jest.fn(),
  },
}));

jest.mock('../../../../../frontend/src/components/data/DataTable/components/DataGridHeader', () => {
  return {
    __esModule: true,
    default: ({ onToggleColumnSelector, onExport, sortField, sortDirection, onSort }) => (
      <div data-testid="data-grid-header">
        <button data-testid="toggle-column-selector" onClick={onToggleColumnSelector}>
          Toggle Columns
        </button>
        <button data-testid="export-button" onClick={onExport}>
          Export
        </button>
        <div data-testid="sort-controls">
          <span data-testid="sort-field">{sortField}</span>
          <span data-testid="sort-direction">{sortDirection}</span>
          <button data-testid="sort-column" onClick={() => onSort('name')}>
            Sort
          </button>
        </div>
      </div>
    ),
  };
});

jest.mock('../../../../../frontend/src/components/data/DataTable/components/DataGridTable', () => {
  return {
    __esModule: true,
    default: React.memo(({ data, columns, onToggleItemSelection }) => (
      <div data-testid="data-grid-table">
        <table>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} data-testid={`row-${index}`}>
                <td>
                  <input 
                    type="checkbox" 
                    data-testid={`select-row-${index}`}
                    onChange={() => onToggleItemSelection(row.id || index.toString())}
                  />
                </td>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )),
  };
});

jest.mock('../../../../../frontend/src/components/data/DataTable/components/Pagination', () => {
  return {
    __esModule: true,
    default: ({ currentPage, totalPages, onPageChange }) => (
      <div data-testid="pagination">
        <button 
          data-testid="prev-page" 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </button>
        <span data-testid="current-page">{currentPage}</span>
        <span data-testid="total-pages">{totalPages}</span>
        <button 
          data-testid="next-page" 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    ),
  };
});

// Mock the notification context
const mockSetNotification = jest.fn();
jest.mock('../../../../../frontend/src/contexts/NotificationContext', () => ({
  useNotification: () => ({ setNotification: mockSetNotification }),
}));

// Mock data
const mockData = {
  id: 'test123',
  name: 'Test Data',
  columns: [
    { key: 'id', title: 'ID' },
    { key: 'name', title: 'Name' },
    { key: 'description', title: 'Description' },
  ],
  rows: [
    { id: '1', name: 'Item 1', description: 'First item' },
    { id: '2', name: 'Item 2', description: 'Second item' },
    { id: '3', name: 'Item 3', description: 'Third item' },
  ],
  totalRows: 3,
};

// Setup mock for useQuery
const setupQueryMock = (data, isLoading = false, isError = false, error = null) => {
  const { useQuery } = require('@tanstack/react-query');
  useQuery.mockImplementation((queryKey, queryFn, options) => {
    return {
      data,
      isLoading,
      isError,
      error,
      refetch: jest.fn(),
    };
  });
};

describe('DataTable', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  afterEach(() => {
    // Cleanup
    jest.resetAllMocks();
  });

  it('should render loading state', () => {
    setupQueryMock(null, true, false);
    
    render(<DataTable dataId="test123" />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should render error state', () => {
    setupQueryMock(null, false, true, new Error('Failed to fetch data'));
    
    render(<DataTable dataId="test123" />);
    
    expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
  });

  it('should render the data grid when data is loaded', async () => {
    setupQueryMock(mockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('data-grid-header')).toBeInTheDocument();
      expect(screen.getByTestId('data-grid-table')).toBeInTheDocument();
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });
  });

  it('should toggle column selector', async () => {
    setupQueryMock(mockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('data-grid-header')).toBeInTheDocument();
    });
    
    // Click toggle column selector button
    await userEvent.click(screen.getByTestId('toggle-column-selector'));
    
    // Column selector should be visible
    await waitFor(() => {
      expect(screen.getByText(/select columns/i)).toBeInTheDocument();
    });
  });

  it('should handle sorting', async () => {
    setupQueryMock(mockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('data-grid-header')).toBeInTheDocument();
    });
    
    // Click sort button
    await userEvent.click(screen.getByTestId('sort-column'));
    
    // Check that sort direction and field have been updated
    await waitFor(() => {
      expect(screen.getByTestId('sort-field').textContent).toBe('name');
      expect(screen.getByTestId('sort-direction').textContent).toBe('asc');
    });
  });

  it('should handle pagination', async () => {
    // Create mock data with more pages
    const paginatedMockData = {
      ...mockData,
      totalRows: 20, // 3 items per page, 7 pages total
    };
    setupQueryMock(paginatedMockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });
    
    // Initial page should be 1
    expect(screen.getByTestId('current-page').textContent).toBe('1');
    
    // Click next page
    await userEvent.click(screen.getByTestId('next-page'));
    
    // Page should be updated to 2
    await waitFor(() => {
      expect(screen.getByTestId('current-page').textContent).toBe('2');
    });
  });

  it('should handle item selection', async () => {
    setupQueryMock(mockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('data-grid-table')).toBeInTheDocument();
    });
    
    // Click to select first row
    await userEvent.click(screen.getByTestId('select-row-0'));
    
    // TODO: Assert selection state 
    // This would typically be internal state, so we'd need to check for visual changes
    // or mock the selection handler to verify it was called
  });

  it('should show export dialog when export button is clicked', async () => {
    setupQueryMock(mockData);
    
    render(<DataTable dataId="test123" />);
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByTestId('data-grid-header')).toBeInTheDocument();
    });
    
    // Click export button
    await userEvent.click(screen.getByTestId('export-button'));
    
    // Export dialog should be visible
    await waitFor(() => {
      expect(screen.getByText(/export options/i)).toBeInTheDocument();
    });
  });
});