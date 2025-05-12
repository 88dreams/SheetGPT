import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import { EntityType } from '../../../../types/sports';

// Import the component to test
import EntityCard from '../EntityCard';

// Mock the child components
jest.mock('../QuickEditForm', () => ({
  QuickEditForm: jest.fn(({ entity, entityType, isEditing, onChange }) => (
    <div data-testid="quick-edit-form">
      <div>Entity: {entity.name}</div>
      <div>Type: {entityType}</div>
      <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
      {isEditing && (
        <button
          data-testid="update-button"
          onClick={() => onChange({ ...entity, name: entity.name + ' (Updated)' })}
        >
          Update
        </button>
      )}
    </div>
  ))
}));

jest.mock('../AdvancedEditForm', () => ({
  AdvancedEditForm: jest.fn(({ entity, entityType, isEditing }) => (
    <div data-testid="advanced-edit-form">
      <div>Entity: {entity.name}</div>
      <div>Type: {entityType}</div>
      <div>Editing: {isEditing ? 'Yes' : 'No'}</div>
    </div>
  ))
}));

jest.mock('../EntityRelatedInfo', () => {
  return {
    __esModule: true,
    default: jest.fn(({ entity, entityType, onEntitySelect }) => (
      <div data-testid="entity-related-info">
        <div>Entity: {entity.name}</div>
        <div>Type: {entityType}</div>
        {onEntitySelect && (
          <button 
            data-testid="select-related"
            onClick={() => onEntitySelect({ id: 'related_1', name: 'Related Entity' })}
          >
            Select Related
          </button>
        )}
      </div>
    ))
  };
});

jest.mock('../EntityResolutionBadge', () => {
  return {
    __esModule: true,
    default: jest.fn(({ matchScore, fuzzyMatched, contextMatched, virtualEntity }) => (
      <div data-testid="resolution-badge">
        {fuzzyMatched && matchScore && <div data-testid="fuzzy-match">{Math.round(matchScore * 100)}%</div>}
        {contextMatched && <div data-testid="context-match">Context</div>}
        {virtualEntity && <div data-testid="virtual-entity">Virtual</div>}
        {!fuzzyMatched && !contextMatched && !virtualEntity && <div data-testid="exact-match">Exact</div>}
      </div>
    ))
  };
});

// Mock the API client hook
jest.mock('../../../../../src/hooks/useApiClient', () => ({
  useApiClient: jest.fn(() => ({
    put: jest.fn(async (url: string, data: any) => {
      return { data: { ...data, updated: true } };
    })
  }))
}));

// Mock the apiCache
jest.mock('../../../../../src/utils/apiCache', () => ({
  apiCache: {
    get: jest.fn((key: string) => {
      if (typeof key === 'string' && key.includes('fuzzy')) {
        return {
          resolution_info: {
            match_score: 0.85,
            fuzzy_matched: true,
            context_matched: false,
            virtual_entity: false,
            resolved_via: 'fuzzy_name_match'
          }
        };
      }
      if (typeof key === 'string' && key.includes('context')) {
        return {
          resolution_info: {
            match_score: 0.9,
            fuzzy_matched: false,
            context_matched: true,
            virtual_entity: false,
            resolved_via: 'context_match'
          }
        };
      }
      if (typeof key === 'string' && key.includes('virtual')) {
        return {
          resolution_info: {
            match_score: 1.0,
            fuzzy_matched: false,
            context_matched: false,
            virtual_entity: true,
            resolved_via: 'virtual_entity'
          }
        };
      }
      return null;
    })
  }
}));

// Mock antd components
jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  
  return Object.assign({}, actual, {
    Card: jest.fn(({ title, children }) => (
      <div data-testid="card">
        <div data-testid="card-title">{title}</div>
        <div>{children}</div>
      </div>
    )),
    Tabs: jest.fn(({ activeKey, onChange, items }) => (
      <div data-testid="tabs-container">
        <div data-testid="tabs-header">
          {items.map(item => (
            <button
              key={item.key}
              data-testid={`tab-${item.key}`}
              data-active={activeKey === item.key ? 'true' : 'false'}
              onClick={() => onChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div data-testid="tab-content">
          {items.find(item => item.key === activeKey)?.children}
        </div>
      </div>
    )),
    Space: jest.fn(({ children, align }) => (
      <div data-testid={`space-${align || 'default'}`}>{children}</div>
    )),
    Button: jest.fn(({ type, icon, onClick, children }) => (
      <button
        data-testid={`button-${type || 'default'}`}
        data-icon={icon ? 'true' : 'false'}
        onClick={onClick}
      >
        {children}
      </button>
    )),
    message: {
      success: jest.fn(),
      error: jest.fn()
    },
    Typography: {
      Title: jest.fn(({ level, style, children }) => (
        <div data-testid={`title-${level}`} data-style={JSON.stringify(style)}>{children}</div>
      )),
      Text: jest.fn(({ type, children }) => (
        <div data-testid={`text-${type || 'default'}`}>{children}</div>
      )),
      Paragraph: jest.fn(({ children }) => <p data-testid="paragraph">{children}</p>)
    }
  });
});

// Mock icons
jest.mock('@ant-design/icons', () => ({
  EditOutlined: () => <span data-testid="edit-icon">EditIcon</span>,
  SaveOutlined: () => <span data-testid="save-icon">SaveIcon</span>,
  LinkOutlined: () => <span data-testid="link-icon">LinkIcon</span>
}));

describe('EntityCard', () => {
  const mockEntity = {
    id: 'team_123',
    name: 'Test Team',
    league_id: 'league_456',
    position: 'CEO',
    start_date: '2023-01-01',
    end_date: '2024-01-01'
  };
  
  const mockOnUpdate = jest.fn();
  const mockOnSelectRelated = jest.fn();
  
  const defaultProps = {
    entity: mockEntity,
    entityType: 'league_executive' as EntityType,
    onUpdate: mockOnUpdate,
    onSelectRelated: mockOnSelectRelated
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    render(<EntityCard {...defaultProps} />);
    
    // Check card rendering
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('card-title')).toBeInTheDocument();
    expect(screen.getByTestId('title-4')).toHaveTextContent('Test Team');
    
    // Check tabs
    expect(screen.getByTestId('tabs-container')).toBeInTheDocument();
    expect(screen.getByTestId('tab-quick')).toBeInTheDocument();
    expect(screen.getByTestId('tab-quick')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('tab-advanced')).toBeInTheDocument();
    expect(screen.getByTestId('tab-related')).toBeInTheDocument();
    
    // Check initial content
    expect(screen.getByTestId('quick-edit-form')).toBeInTheDocument();
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Entity: Test Team');
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Type: league_executive');
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Editing: No');
    
    // Check edit button
    expect(screen.getByTestId('button-default')).toHaveTextContent('Edit');
  });

  it('renders with resolution badge when resolution info is available', () => {
    // Mock apiCache to return resolution info
    const { apiCache } = require('../../../../../src/utils/apiCache');
    apiCache.get.mockReturnValueOnce({
      resolution_info: {
        match_score: 0.85,
        fuzzy_matched: true,
        context_matched: false,
        virtual_entity: false,
        resolved_via: 'fuzzy_name_match'
      }
    });
    
    render(<EntityCard {...defaultProps} entity={{ ...mockEntity, name: 'Fuzzy Team' }} />);
    
    // Check resolution badge rendering
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('fuzzy-match')).toBeInTheDocument();
    expect(screen.getByTestId('fuzzy-match')).toHaveTextContent('85%');
    
    // Check resolved via info
    expect(screen.getByTestId('text-secondary')).toBeInTheDocument();
    expect(screen.getByTestId('text-secondary')).toHaveTextContent('Resolved via: fuzzy_name_match');
  });

  it('handles tab switching correctly', () => {
    render(<EntityCard {...defaultProps} />);
    
    // Initially on quick edit tab
    expect(screen.getByTestId('tab-quick')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('quick-edit-form')).toBeInTheDocument();
    
    // Switch to advanced tab
    fireEvent.click(screen.getByTestId('tab-advanced'));
    expect(screen.getByTestId('tab-advanced')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('advanced-edit-form')).toBeInTheDocument();
    
    // Switch to related tab
    fireEvent.click(screen.getByTestId('tab-related'));
    expect(screen.getByTestId('tab-related')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('entity-related-info')).toBeInTheDocument();
  });

  it('toggles editing mode when edit button is clicked', () => {
    render(<EntityCard {...defaultProps} />);
    
    // Initially not in editing mode
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Editing: No');
    expect(screen.getByTestId('button-default')).toHaveTextContent('Edit');
    
    // Click edit button
    fireEvent.click(screen.getByTestId('button-default'));
    
    // Should now be in editing mode
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Editing: Yes');
    expect(screen.getByTestId('button-primary')).toHaveTextContent('Save Changes');
  });

  it('handles entity updates correctly', async () => {
    const { message } = require('antd');
    const { useApiClient } = require('../../../../../src/hooks/useApiClient');
    
    // Explicitly type the mock function
    const mockPut = jest.fn<() => Promise<{ data: any }>>().mockResolvedValue({
      data: { ...mockEntity, name: 'Test Team (Updated)', updated: true }
    });
    
    useApiClient.mockReturnValue({ put: mockPut });
    
    render(<EntityCard {...defaultProps} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByTestId('button-default'));
    
    // Update the entity
    fireEvent.click(screen.getByTestId('update-button'));
    
    // Save the changes
    fireEvent.click(screen.getByTestId('button-primary'));
    
    // Check API call
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/v1/teams/team_123',
        expect.objectContaining({
          id: 'team_123',
          name: 'Test Team (Updated)'
        })
      );
    });
    
    // Check success message
    expect(message.success).toHaveBeenCalledWith('Entity updated successfully');
    
    // Check onUpdate callback
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'team_123',
        name: 'Test Team (Updated)',
        updated: true
      })
    );
    
    // Should exit edit mode
    await waitFor(() => {
      expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Editing: No');
    });
  });

  it('handles API errors during update', async () => {
    const { message } = require('antd');
    const { useApiClient } = require('../../../../../src/hooks/useApiClient');
    
    const mockError = new Error('API Error');
    // Explicitly type the mock function to expect a Promise rejection
    const mockPut = jest.fn<() => Promise<never>>().mockRejectedValue(mockError);
    
    useApiClient.mockReturnValue({ put: mockPut });
    
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    render(<EntityCard {...defaultProps} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByTestId('button-default'));
    
    // Update the entity
    fireEvent.click(screen.getByTestId('update-button'));
    
    // Save the changes
    fireEvent.click(screen.getByTestId('button-primary'));
    
    // Check API call
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled();
    });
    
    // Check error message
    expect(message.error).toHaveBeenCalledWith('Failed to update entity');
    expect(console.error).toHaveBeenCalledWith('Error updating entity:', mockError);
    
    // Should still be in edit mode
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Editing: Yes');
    
    console.error = originalConsoleError;
  });

  it('handles related entity selection', () => {
    render(<EntityCard {...defaultProps} />);
    
    // Switch to related tab
    fireEvent.click(screen.getByTestId('tab-related'));
    
    // Click the select related button
    fireEvent.click(screen.getByTestId('select-related'));
    
    // Check onSelectRelated callback
    expect(mockOnSelectRelated).toHaveBeenCalledWith({
      id: 'related_1',
      name: 'Related Entity'
    });
  });

  it('handles different entity types correctly', () => {
    const leagueEntity = {
      id: 'league_456',
      name: 'Test League',
      sport: 'Football',
      country: 'USA',
      created_at: '2023-01-01',
      updated_at: '2023-01-01'
    };
    
    render(
      <EntityCard
        entity={leagueEntity}
        entityType="league"
        onUpdate={mockOnUpdate}
      />
    );
    
    // Check entity type is passed correctly
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Type: league');
    expect(screen.getByTestId('quick-edit-form')).toHaveTextContent('Entity: Test League');
  });

  it('renders context match resolution badge', () => {
    // Mock apiCache to return context match resolution info
    const { apiCache } = require('../../../../../src/utils/apiCache');
    apiCache.get.mockReturnValueOnce({
      resolution_info: {
        match_score: 0.9,
        fuzzy_matched: false,
        context_matched: true,
        virtual_entity: false,
        resolved_via: 'context_match'
      }
    });
    
    render(<EntityCard {...defaultProps} entity={{ ...mockEntity, name: 'Context Team' }} />);
    
    // Check resolution badge rendering
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('context-match')).toBeInTheDocument();
    
    // Check resolved via info
    expect(screen.getByTestId('text-secondary')).toBeInTheDocument();
    expect(screen.getByTestId('text-secondary')).toHaveTextContent('Resolved via: context_match');
  });

  it('renders virtual entity resolution badge', () => {
    // Mock apiCache to return virtual entity resolution info
    const { apiCache } = require('../../../../../src/utils/apiCache');
    apiCache.get.mockReturnValueOnce({
      resolution_info: {
        match_score: 1.0,
        fuzzy_matched: false,
        context_matched: false,
        virtual_entity: true,
        resolved_via: 'virtual_entity'
      }
    });
    
    render(<EntityCard {...defaultProps} entity={{ ...mockEntity, name: 'Virtual Team' }} />);
    
    // Check resolution badge rendering
    expect(screen.getByTestId('resolution-badge')).toBeInTheDocument();
    expect(screen.getByTestId('virtual-entity')).toBeInTheDocument();
    
    // Check resolved via info
    expect(screen.getByTestId('text-secondary')).toBeInTheDocument();
    expect(screen.getByTestId('text-secondary')).toHaveTextContent('Resolved via: virtual_entity');
  });
});