import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import GlobalEntityView from '../../../../../frontend/src/components/sports/database/GlobalEntityView';

// Mock the context hook
jest.mock('../../../../../frontend/src/components/sports/database/SportsDatabaseContext', () => {
  return {
    __esModule: true,
    useSportsDatabase: () => ({
      selectedEntityType: null,
      setSelectedEntityType: jest.fn(),
      isLoading: false,
      handleSort: jest.fn(),
      sortField: 'entityType',
      sortDirection: 'asc',
      renderSortIcon: (field: string) => <span data-testid={`sort-icon-${field}`}>↑</span>,
      entityCounts: {
        league: 10,
        team: 25,
        stadium: 15,
        player: 100,
        brand: 5,
        broadcast: 30,
        production: 20,
        division_conference: 8
      },
      fetchEntityCounts: jest.fn(),
      setViewMode: jest.fn()
    })
  };
});

// Mock SportsDatabaseService
jest.mock('../../../../../frontend/src/services/SportsDatabaseService', () => {
  return {
    __esModule: true,
    default: {
      getEntities: jest.fn().mockImplementation((entityType, params) => {
        // Mock response for getEntities with just a single latest record
        const mockRecords = {
          league: [{ id: 'l1', name: 'Test League', updated_at: '2023-01-15T10:00:00Z' }],
          team: [{ id: 't1', name: 'Test Team', updated_at: '2023-02-20T11:30:00Z' }],
          stadium: [{ id: 's1', name: 'Test Stadium', updated_at: '2023-03-10T09:45:00Z' }],
          player: [{ id: 'p1', name: 'Test Player', updated_at: '2023-04-05T14:20:00Z' }],
          brand: [{ id: 'b1', name: 'Test Brand', updated_at: '2023-05-18T16:15:00Z' }],
          broadcast: [{ id: 'bc1', name: 'Test Broadcast', updated_at: '2023-06-22T13:10:00Z' }],
          production: [{ id: 'pr1', name: 'Test Production', updated_at: '2023-07-30T10:30:00Z' }],
          division_conference: [{ id: 'd1', name: 'Test Division', updated_at: '2023-08-15T11:45:00Z' }],
        };
        
        return Promise.resolve({
          data: mockRecords[entityType] || [],
          total: mockRecords[entityType]?.length || 0,
        });
      })
    }
  };
});

// Mock LoadingSpinner component
jest.mock('../../../../../frontend/src/components/common/LoadingSpinner', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="loading-spinner">Loading...</div>
  };
});

// Mock date-fns for consistent testing
jest.mock('date-fns', () => {
  const actual = jest.requireActual('date-fns');
  return {
    ...actual,
    formatDistanceToNow: jest.fn().mockImplementation(() => '2 days ago'),
    parseISO: jest.fn().mockImplementation((dateString) => new Date(dateString))
  };
});

describe('GlobalEntityView', () => {
  // Mock timers for useEffect
  beforeEach(() => {
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render the component with entity data', async () => {
    render(<GlobalEntityView />);
    
    // Wait for data to load and render
    await waitFor(() => {
      expect(screen.getByText('Entity Type')).toBeInTheDocument();
      expect(screen.getByText('Count')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
    
    // Verify entity rows are rendered
    expect(screen.getByText('League')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Stadium')).toBeInTheDocument();
    
    // Verify counts are displayed
    expect(screen.getByText('10')).toBeInTheDocument(); // League count
    expect(screen.getByText('25')).toBeInTheDocument(); // Team count
    expect(screen.getByText('15')).toBeInTheDocument(); // Stadium count
    
    // Verify last updated is displayed
    const lastUpdatedCells = screen.getAllByText('2 days ago');
    expect(lastUpdatedCells.length).toBeGreaterThan(0);
    
    // Verify sort icons are displayed
    expect(screen.getByTestId('sort-icon-entityType')).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', async () => {
    // Override the mock to return loading=true
    jest.spyOn(require('../../../../../frontend/src/components/sports/database/SportsDatabaseContext'), 'useSportsDatabase')
        .mockImplementation(() => ({
          selectedEntityType: null,
          setSelectedEntityType: jest.fn(),
          isLoading: true,
          handleSort: jest.fn(),
          sortField: 'entityType',
          sortDirection: 'asc',
          renderSortIcon: () => <span>↑</span>,
          entityCounts: {},
          fetchEntityCounts: jest.fn(),
          setViewMode: jest.fn()
        }));
    
    render(<GlobalEntityView />);
    
    // Check if loading spinner is rendered
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should handle view entity action', async () => {
    const mockSetSelectedEntityType = jest.fn();
    const mockSetViewMode = jest.fn();
    
    // Override the mock to track function calls
    jest.spyOn(require('../../../../../frontend/src/components/sports/database/SportsDatabaseContext'), 'useSportsDatabase')
        .mockImplementation(() => ({
          selectedEntityType: null,
          setSelectedEntityType: mockSetSelectedEntityType,
          isLoading: false,
          handleSort: jest.fn(),
          sortField: 'entityType',
          sortDirection: 'asc',
          renderSortIcon: () => <span>↑</span>,
          entityCounts: {
            league: 10,
            team: 25
          },
          fetchEntityCounts: jest.fn(),
          setViewMode: mockSetViewMode
        }));
    
    render(<GlobalEntityView />);
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('League')).toBeInTheDocument();
    });
    
    // Find all view buttons and click the first one (League)
    const viewButtons = screen.getAllByRole('button');
    fireEvent.click(viewButtons[0]);
    
    // Verify the context functions were called
    expect(mockSetSelectedEntityType).toHaveBeenCalledWith('league');
    expect(mockSetViewMode).toHaveBeenCalledWith('entity');
  });

  it('should handle sort when clicking column headers', async () => {
    const mockHandleSort = jest.fn();
    
    // Override the mock to track handleSort calls
    jest.spyOn(require('../../../../../frontend/src/components/sports/database/SportsDatabaseContext'), 'useSportsDatabase')
        .mockImplementation(() => ({
          selectedEntityType: null,
          setSelectedEntityType: jest.fn(),
          isLoading: false,
          handleSort: mockHandleSort,
          sortField: 'entityType',
          sortDirection: 'asc',
          renderSortIcon: (field: string) => <span data-testid={`sort-icon-${field}`}>↑</span>,
          entityCounts: {
            league: 10,
            team: 25
          },
          fetchEntityCounts: jest.fn(),
          setViewMode: jest.fn()
        }));
    
    render(<GlobalEntityView />);
    
    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByText('Entity Type')).toBeInTheDocument();
    });
    
    // Click on the "Count" column header
    const countHeader = screen.getByText('Count');
    fireEvent.click(countHeader);
    
    // Verify handleSort was called with the correct field
    expect(mockHandleSort).toHaveBeenCalledWith('count');
    
    // Click on the "Last Updated" column header
    const lastUpdatedHeader = screen.getByText('Last Updated');
    fireEvent.click(lastUpdatedHeader);
    
    // Verify handleSort was called with the correct field
    expect(mockHandleSort).toHaveBeenCalledWith('lastUpdated');
  });

  it('should periodically refresh data', async () => {
    const getEntitiesMock = require('../../../../../frontend/src/services/SportsDatabaseService').default.getEntities;
    
    render(<GlobalEntityView />);
    
    // Initial data fetch should happen on mount
    expect(getEntitiesMock).toHaveBeenCalled();
    
    // Reset the mock to track new calls
    getEntitiesMock.mockClear();
    
    // Fast forward 30 seconds for the refresh interval
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    
    // Should trigger another fetch
    expect(getEntitiesMock).toHaveBeenCalled();
  });
});