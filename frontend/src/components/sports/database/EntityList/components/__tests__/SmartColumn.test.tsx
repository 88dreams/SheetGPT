import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartColumn from '../SmartColumn';
import '@testing-library/jest-dom';

// Mock the isSortableRelationshipField function
jest.mock('../../utils/formatters', () => ({
  isSortableRelationshipField: (field: string) => {
    const relationshipFields = ['league_name', 'league_sport', 'team_id'];
    return relationshipFields.includes(field);
  }
}));

describe('SmartColumn', () => {
  const defaultProps = {
    field: 'name',
    sortField: 'name',
    sortDirection: 'asc' as const,
    handleSort: jest.fn(),
    entities: [{ id: '1', name: 'Test Entity' }],
    selectedEntityType: 'team' as const,
    handleResizeStart: jest.fn(),
    columnWidth: 120,
    draggedHeader: null,
    dragOverHeader: null,
    handleColumnDragStart: jest.fn(),
    handleColumnDragOver: jest.fn(),
    handleColumnDrop: jest.fn(),
    handleColumnDragEnd: jest.fn()
  };

  it('renders the column with correct display name', () => {
    render(<SmartColumn {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
  });

  it('renders the relationship indicator for relationship fields', () => {
    // Test with a relationship field
    const props = { ...defaultProps, field: 'league_name' };
    const { container, rerender } = render(<SmartColumn {...props} />);
    
    // Check if the text is styled with the blue color class
    const nameElement = screen.getByText('League Name');
    expect(nameElement).toHaveClass('text-blue-600');
    
    // Check if the link icon is present
    expect(container.querySelector('svg[class*="text-blue-400"]')).toBeInTheDocument();
    
    // Test with a non-relationship field
    rerender(<SmartColumn {...defaultProps} />);
    const regularElement = screen.getByText('Name');
    expect(regularElement).not.toHaveClass('text-blue-600');
  });

  it('shows the correct sort icon based on sort state', () => {
    // Test ascending sort
    const { container, rerender } = render(<SmartColumn {...defaultProps} />);
    
    // Should have the up arrow for ascending
    expect(container.querySelector('svg[class*="text-blue-500"]')).toBeInTheDocument();
    
    // Test descending sort
    rerender(<SmartColumn {...defaultProps} sortDirection="desc" />);
    
    // Should have the down arrow for descending
    expect(container.querySelector('svg[class*="text-blue-500"]')).toBeInTheDocument();
    
    // Test unsorted column
    rerender(<SmartColumn {...defaultProps} sortField="different_field" />);
    
    // Should have the neutral sort icon
    expect(container.querySelector('svg[class*="text-gray-400"]')).toBeInTheDocument();
  });

  it('calls handleSort when clicked', () => {
    render(<SmartColumn {...defaultProps} />);
    fireEvent.click(screen.getByText('Name'));
    expect(defaultProps.handleSort).toHaveBeenCalledWith('name');
  });

  it('applies drag styling when dragged over', () => {
    const props = { ...defaultProps, dragOverHeader: 'name' };
    const { container } = render(<SmartColumn {...props} />);
    
    // The th element should have the blue background class
    expect(container.querySelector('th')).toHaveClass('bg-blue-100');
  });
});