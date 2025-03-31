import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartColumn, { isRelationshipSortField } from '../SmartColumn';
import '@testing-library/jest-dom';

describe('SmartColumn', () => {
  const defaultProps = {
    field: 'name',
    sortField: 'name',
    sortDirection: 'asc' as const,
    handleSort: jest.fn(),
    entities: [{ id: '1', name: 'Test Entity' }],
  };

  it('renders the column with formatted display name', () => {
    render(<SmartColumn {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('shows relationship indicator for relationship fields', () => {
    // Mock entities with relationship field
    const entities = [
      { 
        id: '1',
        league_id: 'abc-123',
        league_name: 'NFL'
      }
    ];
    
    const { container, rerender } = render(
      <SmartColumn {...defaultProps} field="league_id" entities={entities} />
    );
    
    // Check for blue text
    const nameElement = screen.getByText('League Id');
    expect(nameElement).toHaveClass('text-blue-600');
    
    // Check for the link icon
    expect(container.querySelector('svg[class*="text-blue-400"]')).toBeInTheDocument();
    
    // Test with a known relationship field name
    rerender(<SmartColumn {...defaultProps} field="league_name" entities={entities} />);
    const leagueNameElement = screen.getByText('League Name');
    expect(leagueNameElement).toHaveClass('text-blue-600');
    
    // Test with a non-relationship field
    rerender(<SmartColumn {...defaultProps} field="description" entities={entities} />);
    const descriptionElement = screen.getByText('Description');
    expect(descriptionElement).not.toHaveClass('text-blue-600');
  });

  it('shows different sort icons based on sort state', () => {
    const { container, rerender } = render(<SmartColumn {...defaultProps} />);
    
    // Ascending sort
    expect(container.querySelector('svg[class*="text-blue-500"]')).toBeInTheDocument();
    
    // Descending sort
    rerender(<SmartColumn {...defaultProps} sortDirection="desc" />);
    expect(container.querySelector('svg[class*="text-blue-500"]')).toBeInTheDocument();
    
    // Unsorted column
    rerender(<SmartColumn {...defaultProps} sortField="different_field" />);
    expect(container.querySelector('svg[class*="text-gray-400"]')).toBeInTheDocument();
  });

  it('calls handleSort when clicked', () => {
    const handleSort = jest.fn();
    render(<SmartColumn {...defaultProps} handleSort={handleSort} />);
    
    fireEvent.click(screen.getByText('Name'));
    expect(handleSort).toHaveBeenCalledWith('name');
  });

  it('renders resize handle when handleResizeStart is provided', () => {
    const handleResizeStart = jest.fn();
    const { container } = render(
      <SmartColumn 
        {...defaultProps} 
        handleResizeStart={handleResizeStart} 
      />
    );
    
    expect(container.querySelector('.cursor-col-resize')).toBeInTheDocument();
  });

  it('does not render resize handle when handleResizeStart is not provided', () => {
    const { container } = render(<SmartColumn {...defaultProps} />);
    
    expect(container.querySelector('.cursor-col-resize')).not.toBeInTheDocument();
  });

  it('renders additional header content when provided', () => {
    render(
      <SmartColumn 
        {...defaultProps} 
        additionalHeaderContent={<span data-testid="additional-content">Extra Content</span>} 
      />
    );
    
    expect(screen.getByTestId('additional-content')).toBeInTheDocument();
  });
});

describe('isRelationshipSortField', () => {
  it('identifies fields with _id suffix and corresponding _name field', () => {
    const entities = [
      { 
        team_id: '123',
        team_name: 'Chicago Bears'
      }
    ];
    
    expect(isRelationshipSortField('team_id', entities)).toBe(true);
  });
  
  it('identifies known relationship fields', () => {
    const entities = [{ id: '1' }];
    
    expect(isRelationshipSortField('league_name', entities)).toBe(true);
    expect(isRelationshipSortField('entity_name', entities)).toBe(true);
    expect(isRelationshipSortField('team_name', entities)).toBe(true);
  });
  
  it('returns false for regular fields', () => {
    const entities = [{ id: '1', name: 'Test' }];
    
    expect(isRelationshipSortField('id', entities)).toBe(false);
    expect(isRelationshipSortField('name', entities)).toBe(false);
    expect(isRelationshipSortField('description', entities)).toBe(false);
  });
  
  it('returns false for empty entities array', () => {
    expect(isRelationshipSortField('league_name', [])).toBe(false);
  });
});