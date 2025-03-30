import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import SmartEntitySearch from '../../../../../frontend/src/components/data/EntityUpdate/SmartEntitySearch';

// Import the test utilities
import { setupEntityResolutionMocks } from '../../../utils/entityResolutionTestUtils';

// Setup mocks with our utility
const { resolveEntityMock, apiCacheGetMock, createMemoEqualityFnMock, cleanup: cleanupMocks } = setupEntityResolutionMocks();

// Mock the entityResolver utility
jest.mock('../../../../../frontend/src/utils/entityResolver', () => ({
  entityResolver: {
    resolveEntity: resolveEntityMock
  },
  createMemoEqualityFn: jest.fn((obj) => obj)
}));

// Mock the apiCache utility
jest.mock('../../../../../frontend/src/utils/apiCache', () => ({
  apiCache: {
    get: apiCacheGetMock
  }
}));

// Mock fingerprint utility
jest.mock('../../../../../frontend/src/utils/fingerprint', () => ({
  createMemoEqualityFn: createMemoEqualityFnMock
}));

// Mock antd components
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  
  return {
    ...actual,
    AutoComplete: jest.fn(({ options, onSelect, onSearch, value, placeholder, notFoundContent, children }) => (
      <div data-testid="auto-complete">
        <input
          data-testid="search-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onSearch(e.target.value)}
        />
        <div data-testid="options-container">
          {notFoundContent && options.length === 0 && (
            <div data-testid="not-found">{notFoundContent}</div>
          )}
          {options.map((option, index) => (
            <div 
              key={option.key || index}
              data-testid={`option-${index}`}
              data-value={option.value}
              data-entity={JSON.stringify(option.entity)}
              onClick={() => onSelect(option.value, option)}
            >
              {React.isValidElement(option.label) ? (
                <div data-testid={`option-label-${index}`}>{option.value}</div>
              ) : (
                option.label || option.value
              )}
            </div>
          ))}
        </div>
        {children}
      </div>
    )),
    Input: jest.fn(({ prefix, suffix, value, onChange, placeholder, loading }) => (
      <div data-testid="input-container">
        {prefix && <span data-testid="input-prefix">{prefix}</span>}
        <input
          data-testid="input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        {loading && <span data-testid="loading-indicator">Loading...</span>}
        {suffix && <span data-testid="input-suffix">{suffix}</span>}
      </div>
    )),
    Space: jest.fn(({ children }) => (
      <div data-testid="space">{children}</div>
    )),
    Tag: jest.fn(({ color, children }) => (
      <span data-testid={`tag-${color}`}>{children}</span>
    )),
    Tooltip: jest.fn(({ title, children }) => (
      <div data-testid="tooltip" data-title={title}>{children}</div>
    ))
  };
});

// Mock icons
jest.mock('@ant-design/icons', () => ({
  SearchOutlined: () => <span data-testid="search-icon">SearchIcon</span>,
  QuestionCircleOutlined: () => <span data-testid="question-icon">QuestionIcon</span>,
  CheckCircleFilled: () => <span data-testid="check-icon">CheckIcon</span>
}));

describe('SmartEntitySearch', () => {
  const mockOnEntitySelect = jest.fn();
  const defaultProps = {
    onEntitySelect: mockOnEntitySelect,
    entityTypes: ['league', 'team', 'stadium'],
    placeholder: 'Search entities...',
    minimumMatchScore: 0.6,
    showMatchDetails: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    cleanupMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with default props', () => {
    render(<SmartEntitySearch {...defaultProps} />);
    
    expect(screen.getByTestId('auto-complete')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Search entities...');
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('question-icon')).toBeInTheDocument();
  });

  it('does not search when input is too short', async () => {
    render(<SmartEntitySearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    
    // Enter a single character (too short)
    fireEvent.change(input, { target: { value: 'a' } });
    jest.advanceTimersByTime(500);
    
    // No search should be triggered
    expect(resolveEntityMock).not.toHaveBeenCalled();
  });

  it('searches for entities when input is valid', async () => {
    render(<SmartEntitySearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    
    // Enter a valid search term
    fireEvent.change(input, { target: { value: 'exact team' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Check if search was triggered for each entity type
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledTimes(3); // Once for each entity type
      expect(resolveEntityMock).toHaveBeenCalledWith(
        'league',
        'exact team',
        expect.objectContaining({
          allowFuzzy: true,
          minimumMatchScore: 0.6
        })
      );
      expect(resolveEntityMock).toHaveBeenCalledWith(
        'team',
        'exact team',
        expect.objectContaining({
          allowFuzzy: true,
          minimumMatchScore: 0.6
        })
      );
      expect(resolveEntityMock).toHaveBeenCalledWith(
        'stadium',
        'exact team',
        expect.objectContaining({
          allowFuzzy: true,
          minimumMatchScore: 0.6
        })
      );
    });
  });

  it('renders search results with match details', async () => {
    // Set up custom implementation for this test
    resolveEntityMock.mockImplementation(async (type, name) => {
      return { 
        id: `${type}_1`, 
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Result`, 
        type: type
      };
    });
    
    render(<SmartEntitySearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    
    // Enter a valid search term
    fireEvent.change(input, { target: { value: 'exact' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledTimes(3);
    });
    
    // Check for option elements (exact query selects elements more specifically)
    expect(screen.getByTestId('option-0')).toBeInTheDocument();
    expect(screen.getByTestId('option-1')).toBeInTheDocument();
    expect(screen.getByTestId('option-2')).toBeInTheDocument();
  });

  it('selects an entity when clicking on a result', async () => {
    // Set up custom resolver for this test
    resolveEntityMock.mockImplementation(async (type, name) => {
      return { 
        id: `${type}_1`, 
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Test`, 
        type: type
      };
    });
    
    render(<SmartEntitySearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    
    // Enter a valid search term
    fireEvent.change(input, { target: { value: 'exact search' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledTimes(3);
    });
    
    // Check for option elements one by one (more reliable)
    const option = screen.getByTestId('option-0');
    expect(option).toBeInTheDocument();
    
    // Click on the first result
    fireEvent.click(option);
    
    // Check if onEntitySelect was called with the right entity
    expect(mockOnEntitySelect).toHaveBeenCalledTimes(1);
  });

  it('shows not found content when no results are found', async () => {
    // Mock implementation to return null for all entity types
    resolveEntityMock.mockImplementation(async () => null);
    
    render(<SmartEntitySearch {...defaultProps} />);
    const input = screen.getByTestId('search-input');
    
    // Enter a search term that will return no results
    fireEvent.change(input, { target: { value: 'not found' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Wait for the not found message
    await waitFor(() => {
      expect(screen.getByTestId('not-found')).toBeInTheDocument();
      expect(screen.getByTestId('not-found')).toHaveTextContent('No entities found');
    });
  });

  it('respects minimumMatchScore parameter', async () => {
    render(
      <SmartEntitySearch 
        {...defaultProps} 
        minimumMatchScore={0.9} // Higher threshold
      />
    );
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'test search' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Check if search was triggered with the correct minimumMatchScore
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          minimumMatchScore: 0.9
        })
      );
    });
  });

  it('uses context for entity resolution when provided', async () => {
    const context = { league_id: 'league_123', team_id: 'team_456' };
    
    render(
      <SmartEntitySearch 
        {...defaultProps} 
        context={context}
      />
    );
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'context search' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Check if search was triggered with the correct context
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledWith(
        expect.any(String),
        'context search',
        expect.objectContaining({
          context
        })
      );
    });
  });

  it('can hide match details when showMatchDetails is false', async () => {
    // Reset mock implementation for this test with exact match for test names
    resolveEntityMock.mockImplementation(async (type, name) => {
      if (name.includes('test')) {
        return { 
          id: `${type}_test`, 
          name: `Test ${type.charAt(0).toUpperCase() + type.slice(1)}`, 
          type: type
        };
      }
      return null;
    });
    
    // Mock proper resolution info
    apiCacheGetMock.mockImplementation((key) => {
      if (key.includes('test')) {
        return {
          resolution_info: {
            match_score: 0.9,
            fuzzy_matched: false,
            context_matched: false,
            virtual_entity: false,
            resolved_via: 'exact_match'
          }
        };
      }
      return null;
    });
    
    render(
      <SmartEntitySearch 
        {...defaultProps} 
        showMatchDetails={false}
      />
    );
    
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'test search' } });
    
    // Wait for debounce
    jest.advanceTimersByTime(500);
    
    // Wait for async operations to complete
    await waitFor(() => {
      expect(resolveEntityMock).toHaveBeenCalledTimes(3);
    });
    
    // Check for option elements individually
    expect(screen.getByTestId('option-0')).toBeInTheDocument();
    
    // Get all tags in the results
    const entityTypeTags = screen.getAllByTestId(/^tag-/);
    
    // Should have entity type tags, but no match detail tags
    expect(entityTypeTags.length).toBeGreaterThan(0);
    // Fuzzy/Exact/Context match tags should not be present when showMatchDetails=false
    expect(screen.queryByTestId('tag-green')).not.toBeInTheDocument();
  });
});