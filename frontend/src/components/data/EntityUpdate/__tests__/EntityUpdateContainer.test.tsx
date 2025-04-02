import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EntityUpdateContainer from '../../../../../frontend/src/components/data/EntityUpdate/EntityUpdateContainer';

// Mock the child components
jest.mock('../../../../../frontend/src/components/data/EntityUpdate/SmartEntitySearch', () => {
  return {
    __esModule: true,
    default: ({ onEntitySelect, entityTypes }) => (
      <div data-testid="smart-entity-search">
        <select 
          data-testid="entity-type-selector" 
          onChange={(e) => {
            // Simulate selecting an entity based on type
            const type = e.target.value;
            const mockEntities = {
              'league': { id: 'league1', name: 'Test League', sport: 'Football' },
              'team': { id: 'team1', name: 'Test Team', league_id: 'league1', stadium_id: 'stadium1' },
              'stadium': { id: 'stadium1', name: 'Test Stadium', capacity: 50000 },
              'division_conference': { id: 'div1', name: 'Test Division', league_id: 'league1', type: 'Division' },
              'broadcast': { id: 'broadcast1', name: 'Test Broadcast', broadcast_company_id: 'company1', entity_type: 'game' },
              'production': { id: 'production1', name: 'Test Production', production_company_id: 'company1', entity_type: 'game' },
              'brand': { id: 'brand1', name: 'Test Brand', industry: 'Sports', partner: 'Test League', partner_relationship: 'sponsor' },
              'unknown': { id: 'unknown1', name: 'Unknown Entity' }
            };
            
            onEntitySelect(mockEntities[type]);
          }}
        >
          <option value="">Select Entity Type</option>
          {entityTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
    )
  };
});

jest.mock('../../../../../frontend/src/components/data/EntityUpdate/EntityCard', () => {
  return {
    __esModule: true,
    default: ({ entity, entityType, onUpdate }) => (
      <div data-testid="entity-card">
        <div data-testid="entity-info">
          <div>ID: {entity.id}</div>
          <div>Type: {entityType}</div>
          <div>Name: {entity.name}</div>
        </div>
        <button 
          data-testid="update-entity-button"
          onClick={() => {
            // Simulate updating entity
            const updatedEntity = { ...entity, name: entity.name + ' (Updated)' };
            onUpdate(updatedEntity);
          }}
        >
          Update Entity
        </button>
      </div>
    )
  };
});

// Mock Typography to simplify testing
jest.mock('antd', () => {
  const Original = jest.requireActual('antd');
  return {
    ...Original,
    Typography: {
      Title: ({ children, level }) => <h1 data-testid={`title-${level}`}>{children}</h1>,
      Text: ({ children }) => <p data-testid="text">{children}</p>,
      Paragraph: ({ children }) => <p data-testid="paragraph">{children}</p>,
    },
    Card: ({ children, title }) => (
      <div data-testid="card">
        {title && <div data-testid="card-title">{title}</div>}
        {children}
      </div>
    ),
    Space: ({ children, direction }) => (
      <div data-testid={`space-${direction}`}>{children}</div>
    ),
    Alert: ({ message, description, type }) => (
      <div data-testid={`alert-${type}`}>
        <div data-testid="alert-message">{message}</div>
        {description && <div data-testid="alert-description">{description}</div>}
      </div>
    ),
  };
});

describe('EntityUpdateContainer', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  it('should render the component with initial state', () => {
    render(<EntityUpdateContainer />);
    
    // Verify header and info text rendered
    expect(screen.getByTestId('title-2')).toHaveTextContent('Update Existing Records');
    expect(screen.getByTestId('alert-info')).toBeInTheDocument();
    
    // Verify search component is rendered
    expect(screen.getByTestId('smart-entity-search')).toBeInTheDocument();
    
    // Verify entity card is not rendered initially
    expect(screen.queryByTestId('entity-card')).not.toBeInTheDocument();
  });

  it('should detect league entity type correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select league entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'league' } });
    
    // Wait for entity card to appear with correct entity type
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Type: league');
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test League');
    });
  });

  it('should detect team entity type correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select team entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'team' } });
    
    // Wait for entity card to appear with correct entity type
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Type: team');
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Team');
    });
  });

  it('should detect stadium entity type correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select stadium entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'stadium' } });
    
    // Wait for entity card to appear with correct entity type
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Type: stadium');
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Stadium');
    });
  });

  it('should detect division_conference entity type correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select division_conference entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'division_conference' } });
    
    // Wait for entity card to appear with correct entity type
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Type: division_conference');
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Division');
    });
  });

  it('should detect broadcast entity type correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select broadcast entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'broadcast' } });
    
    // Wait for entity card to appear with correct entity type
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Type: broadcast');
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Broadcast');
    });
  });

  it('should handle entity updates correctly', async () => {
    render(<EntityUpdateContainer />);
    
    // Select brand entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'brand' } });
    
    // Wait for entity card to appear
    await waitFor(() => {
      expect(screen.getByTestId('entity-card')).toBeInTheDocument();
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Brand');
    });
    
    // Update the entity
    fireEvent.click(screen.getByTestId('update-entity-button'));
    
    // Verify entity was updated in the UI
    await waitFor(() => {
      expect(screen.getByTestId('entity-info')).toHaveTextContent('Name: Test Brand (Updated)');
    });
  });

  it('should handle unknown entity types appropriately', async () => {
    render(<EntityUpdateContainer />);
    
    // Select unknown entity type
    const selector = screen.getByTestId('entity-type-selector');
    fireEvent.change(selector, { target: { value: 'unknown' } });
    
    // Entity card should not be rendered as type cannot be determined
    await waitFor(() => {
      expect(screen.queryByTestId('entity-card')).not.toBeInTheDocument();
    });
  });
});