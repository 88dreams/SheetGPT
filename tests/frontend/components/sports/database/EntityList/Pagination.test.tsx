import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import Pagination from '../../../../../../frontend/src/components/sports/database/EntityList/components/Pagination';

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 2,
    setCurrentPage: jest.fn(),
    totalPages: 5,
    pageSize: 25,
    setPageSize: jest.fn(),
    totalItems: 112
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the pagination with correct information', () => {
    render(<Pagination {...defaultProps} />);
    
    // Check for page information
    expect(screen.getByText('Showing 26 to 50 of 112 results')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
    
    // Check for navigation buttons
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Last')).toBeInTheDocument();
    
    // Check for page size selector
    expect(screen.getByText('25 per page')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('25');
  });

  it('should handle page changes correctly', () => {
    render(<Pagination {...defaultProps} />);
    
    // Click the First button
    fireEvent.click(screen.getByText('First'));
    expect(defaultProps.setCurrentPage).toHaveBeenCalledWith(1);
    
    // Click the Previous button
    fireEvent.click(screen.getByText('Previous'));
    expect(defaultProps.setCurrentPage).toHaveBeenCalledWith(1);
    
    // Click the Next button
    fireEvent.click(screen.getByText('Next'));
    expect(defaultProps.setCurrentPage).toHaveBeenCalledWith(3);
    
    // Click the Last button
    fireEvent.click(screen.getByText('Last'));
    expect(defaultProps.setCurrentPage).toHaveBeenCalledWith(5);
  });

  it('should handle page size changes', () => {
    render(<Pagination {...defaultProps} />);
    
    // Get the page size selector
    const pageSizeSelector = screen.getByRole('combobox');
    
    // Change the page size to 50
    fireEvent.change(pageSizeSelector, { target: { value: '50' } });
    expect(defaultProps.setPageSize).toHaveBeenCalledWith(50);
    
    // Change the page size to 100
    fireEvent.change(pageSizeSelector, { target: { value: '100' } });
    expect(defaultProps.setPageSize).toHaveBeenCalledWith(100);
  });

  it('should disable First and Previous buttons on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    // Check that First and Previous buttons are disabled
    expect(screen.getByText('First')).toBeDisabled();
    expect(screen.getByText('Previous')).toBeDisabled();
    
    // Check that Next and Last buttons are not disabled
    expect(screen.getByText('Next')).not.toBeDisabled();
    expect(screen.getByText('Last')).not.toBeDisabled();
  });

  it('should disable Next and Last buttons on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    
    // Check that Next and Last buttons are disabled
    expect(screen.getByText('Next')).toBeDisabled();
    expect(screen.getByText('Last')).toBeDisabled();
    
    // Check that First and Previous buttons are not disabled
    expect(screen.getByText('First')).not.toBeDisabled();
    expect(screen.getByText('Previous')).not.toBeDisabled();
  });

  it('should display correct items range for last page with remaining items', () => {
    // Last page with fewer items than pageSize
    render(<Pagination 
      {...defaultProps} 
      currentPage={5} 
      pageSize={25} 
      totalItems={112} 
    />);
    
    // 25 items per page * 4 pages = 100 items, then 12 more on page 5
    expect(screen.getByText('Showing 101 to 112 of 112 results')).toBeInTheDocument();
  });

  it('should display correct items range for single page of results', () => {
    render(<Pagination 
      {...defaultProps} 
      currentPage={1} 
      totalPages={1} 
      totalItems={5} 
    />);
    
    expect(screen.getByText('Showing 1 to 5 of 5 results')).toBeInTheDocument();
  });
});