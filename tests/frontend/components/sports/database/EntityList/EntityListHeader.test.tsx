import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import EntityListHeader from '../../../../../../frontend/src/components/sports/database/EntityList/components/EntityListHeader';

// Mock the formatter utility
jest.mock('../../../../../../frontend/src/components/sports/database/EntityList/utils/formatters', () => ({
  getEntityTypeName: (type: string) => {
    const names: Record<string, string> = {
      'league': 'Leagues',
      'team': 'Teams',
      'stadium': 'Stadiums',
      'player': 'Players',
      'brand': 'Brands',
      'broadcast': 'Broadcast Rights',
      'production': 'Production Services',
      'division_conference': 'Divisions & Conferences'
    };
    return names[type] || type;
  }
}));

describe('EntityListHeader Component', () => {
  const defaultProps = {
    selectedEntityType: 'team',
    showColumnSelector: false,
    setShowColumnSelector: jest.fn(),
    showFullUuids: false,
    setShowFullUuids: jest.fn(),
    openExportDialog: jest.fn(),
    onSearch: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the component with correct entity type name', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    // Verify the entity type name is rendered correctly
    expect(screen.getByText('Teams')).toBeInTheDocument();
    
    // Verify the search input is rendered
    expect(screen.getByPlaceholderText('Search Teams')).toBeInTheDocument();
    
    // Verify the buttons are rendered
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Columns')).toBeInTheDocument();
    expect(screen.getByText('Names')).toBeInTheDocument();
  });

  it('should call onSearch when input value changes', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search Teams');
    
    // Type in the search input
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    // Verify onSearch is called with the correct value
    expect(defaultProps.onSearch).toHaveBeenCalledWith('test search');
  });

  it('should not call onSearch when input value is less than 3 characters', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search Teams');
    
    // Type short text in the search input
    fireEvent.change(searchInput, { target: { value: 'te' } });
    
    // Verify onSearch is not called
    expect(defaultProps.onSearch).not.toHaveBeenCalled();
  });

  it('should toggle column selector when Columns button is clicked', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    const columnsButton = screen.getByText('Columns');
    
    // Click the columns button
    fireEvent.click(columnsButton);
    
    // Verify setShowColumnSelector is called with the opposite of current value
    expect(defaultProps.setShowColumnSelector).toHaveBeenCalledWith(true);
  });

  it('should toggle UUID display when Names/IDs button is clicked', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    const uuidsButton = screen.getByText('Names');
    
    // Click the UUIDs button
    fireEvent.click(uuidsButton);
    
    // Verify setShowFullUuids is called with the opposite of current value
    expect(defaultProps.setShowFullUuids).toHaveBeenCalledWith(true);
  });

  it('should open export dialog when Export button is clicked', () => {
    render(<EntityListHeader {...defaultProps} />);
    
    const exportButton = screen.getByText('Export');
    
    // Click the export button
    fireEvent.click(exportButton);
    
    // Verify openExportDialog is called
    expect(defaultProps.openExportDialog).toHaveBeenCalled();
  });

  it('should display "IDs" on the button when showFullUuids is true', () => {
    render(<EntityListHeader {...defaultProps} showFullUuids={true} />);
    
    // Verify the button text is "IDs"
    expect(screen.getByText('IDs')).toBeInTheDocument();
  });

  it('should highlight columns button when column selector is visible', () => {
    render(<EntityListHeader {...defaultProps} showColumnSelector={true} />);
    
    const columnsButton = screen.getByText('Columns');
    
    // Verify the button has the active class (we check for presence in className)
    expect(columnsButton.parentElement).toHaveClass('bg-blue-600 text-white');
  });
});