import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import ExportDialog from '../../../../../../frontend/src/components/sports/database/EntityList/components/ExportDialog';

describe('ExportDialog Component', () => {
  const mockEntities = [
    { id: '1', name: 'Entity 1', created_at: '2023-01-01', updated_at: '2023-01-02' }
  ];
  
  const defaultProps = {
    showExportDialog: true,
    setShowExportDialog: jest.fn(),
    exportFileName: 'export_data',
    setExportFileName: jest.fn(),
    selectedFolderName: '',
    handleFolderSelection: jest.fn(),
    handleCsvExport: jest.fn().mockResolvedValue(undefined),
    handleSheetsExport: jest.fn().mockResolvedValue(undefined),
    entities: mockEntities,
    visibleColumns: ['id', 'name', 'created_at', 'updated_at']
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the export dialog when showExportDialog is true', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Verify dialog title is shown
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    
    // Verify file name input is shown with correct value
    const fileNameInput = screen.getByPlaceholderText('Enter file name');
    expect(fileNameInput).toHaveValue('export_data');
    
    // Verify buttons are shown
    expect(screen.getByText('Select Folder')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Export to CSV')).toBeInTheDocument();
    expect(screen.getByText('Export to Google Sheets')).toBeInTheDocument();
  });

  it('should not render the dialog when showExportDialog is false', () => {
    render(<ExportDialog {...defaultProps} showExportDialog={false} />);
    
    // Verify dialog is not shown
    expect(screen.queryByText('Export Data')).not.toBeInTheDocument();
  });

  it('should handle file name changes', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Get the file name input
    const fileNameInput = screen.getByPlaceholderText('Enter file name');
    
    // Change the file name
    fireEvent.change(fileNameInput, { target: { value: 'new_file_name' } });
    
    // Verify setExportFileName is called with the new value
    expect(defaultProps.setExportFileName).toHaveBeenCalledWith('new_file_name');
  });

  it('should handle folder selection', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Click the select folder button
    const selectFolderButton = screen.getByText('Select Folder');
    fireEvent.click(selectFolderButton);
    
    // Verify handleFolderSelection is called
    expect(defaultProps.handleFolderSelection).toHaveBeenCalled();
  });

  it('should display selected folder name when available', () => {
    render(<ExportDialog {...defaultProps} selectedFolderName="My Google Drive Folder" />);
    
    // Verify the selected folder name is shown
    expect(screen.getByText('Selected: My Google Drive Folder')).toBeInTheDocument();
  });

  it('should handle CSV export correctly', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Click the CSV export button
    const csvButton = screen.getByText('Export to CSV');
    fireEvent.click(csvButton);
    
    // Verify dialog is closed
    expect(defaultProps.setShowExportDialog).toHaveBeenCalledWith(false);
    
    // Verify handleCsvExport is called with the correct arguments
    expect(defaultProps.handleCsvExport).toHaveBeenCalledWith(
      mockEntities,
      ['id', 'name', 'created_at', 'updated_at']
    );
  });

  it('should handle Google Sheets export correctly', async () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Click the Sheets export button
    const sheetsButton = screen.getByText('Export to Google Sheets');
    fireEvent.click(sheetsButton);
    
    // Verify dialog is closed
    expect(defaultProps.setShowExportDialog).toHaveBeenCalledWith(false);
    
    // Verify handleSheetsExport is called with the correct arguments
    expect(defaultProps.handleSheetsExport).toHaveBeenCalledWith(
      mockEntities,
      ['id', 'name', 'created_at', 'updated_at']
    );
  });

  it('should close dialog when Cancel button is clicked', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Click the Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Verify setShowExportDialog is called with false
    expect(defaultProps.setShowExportDialog).toHaveBeenCalledWith(false);
  });

  it('should close dialog when × button is clicked', () => {
    render(<ExportDialog {...defaultProps} />);
    
    // Click the × button
    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);
    
    // Verify setShowExportDialog is called with false
    expect(defaultProps.setShowExportDialog).toHaveBeenCalledWith(false);
  });

  it('should filter visible columns to only include those in the data', () => {
    // Add a column that doesn't exist in the data
    const visibleColumns = [...defaultProps.visibleColumns, 'nonexistent_field'];
    
    render(<ExportDialog {...defaultProps} visibleColumns={visibleColumns} />);
    
    // Click the CSV export button
    const csvButton = screen.getByText('Export to CSV');
    fireEvent.click(csvButton);
    
    // Verify handleCsvExport is called only with the columns that exist in the data
    expect(defaultProps.handleCsvExport).toHaveBeenCalledWith(
      mockEntities,
      ['id', 'name', 'created_at', 'updated_at'] // 'nonexistent_field' should be filtered out
    );
  });
});