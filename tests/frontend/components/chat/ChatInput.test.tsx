import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';

// Import the component to test
import ChatInput from '../../../../../frontend/src/components/chat/ChatInput';

// Mock the StructuredFormatModal component
jest.mock('../../../../../frontend/src/components/chat/StructuredFormatModal', () => {
  return {
    __esModule: true,
    default: ({ isOpen, onClose, onApply }) => (
      <div data-testid="structured-format-modal" style={{ display: isOpen ? 'block' : 'none' }}>
        <button 
          data-testid="apply-table-format"
          onClick={() => onApply({ type: 'table', headers: ['col1', 'col2'], rows: [] })}
        >
          Apply Table Format
        </button>
        <button 
          data-testid="apply-list-format"
          onClick={() => onApply({ type: 'list', items: [] })}
        >
          Apply List Format
        </button>
        <button data-testid="close-format-modal" onClick={onClose}>Close</button>
      </div>
    )
  };
});

// Mock LoadingSpinner
jest.mock('../../../../../frontend/src/components/common/LoadingSpinner', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="loading-spinner">Loading...</div>
  };
});

// Mock the icons
jest.mock('@heroicons/react/24/outline', () => ({
  TableCellsIcon: () => <div data-testid="table-cells-icon" />,
  DocumentTextIcon: () => <div data-testid="document-text-icon" />,
  XMarkIcon: () => <div data-testid="x-mark-icon" />,
  ArrowsUpDownIcon: () => <div data-testid="arrows-updown-icon" />,
}));

// Mock PapaParse
jest.mock('papaparse', () => ({
  parse: jest.fn((csvContent, options) => {
    // Simulate CSV parsing
    options.complete({
      data: [
        ['Name', 'Age', 'City'],
        ['John', '25', 'New York'],
        ['Jane', '30', 'Los Angeles']
      ],
      errors: []
    });
  })
}));

// Mock file reading
global.FileReader = class {
  onload: Function = () => {};
  readAsText(file: File) {
    // Simulate reading file content
    setTimeout(() => {
      this.onload({ target: { result: 'Sample file content' } });
    }, 0);
  }
};

describe('ChatInput', () => {
  let mockOnSend: jest.Mock;
  
  beforeEach(() => {
    mockOnSend = jest.fn();
    jest.clearAllMocks();
    
    // Reset FileReader mock
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockImplementation((key) => {
          return key === 'chatInputHeight' ? '120' : null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true
    });
  });

  it('should render the component with initial state', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Check basic elements
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByTestId('table-cells-icon')).toBeInTheDocument();
    expect(screen.getByTestId('document-text-icon')).toBeInTheDocument();
    expect(screen.getByTestId('arrows-updown-icon')).toBeInTheDocument();
    
    // Verify format and file indicators are not shown initially
    expect(screen.queryByText('Structured format active')).not.toBeInTheDocument();
    expect(screen.queryByText('File attached:')).not.toBeInTheDocument();
    
    // Verify textarea has the height loaded from localStorage
    const textarea = screen.getByPlaceholderText('Type your message...');
    expect(textarea).toHaveStyle('height: 120px');
  });

  it('should handle text input and send message', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Type a message
    const textArea = screen.getByPlaceholderText('Type your message...');
    await userEvent.type(textArea, 'Hello, world!');
    
    // Click send button
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    
    // Verify onSend was called with the correct arguments
    expect(mockOnSend).toHaveBeenCalledWith('Hello, world!', undefined, undefined);
    
    // Verify the input was cleared
    expect(textArea).toHaveValue('');
  });

  it('should handle Enter key to send message', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Type a message
    const textArea = screen.getByPlaceholderText('Type your message...');
    await userEvent.type(textArea, 'Hello, world!');
    
    // Press Enter key
    fireEvent.keyDown(textArea, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Verify onSend was called
    expect(mockOnSend).toHaveBeenCalledWith('Hello, world!', undefined, undefined);
  });

  it('should not send on Shift+Enter', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Type a message
    const textArea = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(textArea, 'Hello, world!');
    
    // Press Shift+Enter
    fireEvent.keyDown(textArea, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true });
    
    // Verify onSend was not called
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should disable send button when input is empty', () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
    
    // Type something to enable the button
    const textArea = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(textArea, { target: { value: 'Hello' } });
    
    expect(sendButton).not.toBeDisabled();
    
    // Clear the input to disable the button again
    fireEvent.change(textArea, { target: { value: '' } });
    expect(sendButton).toBeDisabled();
  });

  it('should open and apply structured format', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Click the format button
    const formatButton = screen.getByTestId('table-cells-icon').closest('button');
    fireEvent.click(formatButton);
    
    // Check if modal is shown
    expect(screen.getByTestId('structured-format-modal')).toHaveStyle('display: block');
    
    // Apply a table format
    fireEvent.click(screen.getByTestId('apply-table-format'));
    
    // Verify format indicator is shown
    expect(screen.getByText('Format:')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    
    // Send a message with the format
    const textArea = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(textArea, 'Please create a table');
    fireEvent.click(screen.getByText('Send'));
    
    // Verify onSend was called with the format
    expect(mockOnSend).toHaveBeenCalledWith(
      'Please create a table',
      { type: 'table', headers: ['col1', 'col2'], rows: [] },
      undefined
    );
    
    // Verify format was cleared after sending
    expect(screen.queryByText('Format:')).not.toBeInTheDocument();
  });

  it('should handle file upload', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Create a mock file
    const file = new File(['test file content'], 'test.txt', { type: 'text/plain' });
    
    // Get the file input and trigger a change event
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.getByText('File:')).toBeInTheDocument();
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
    
    // Send a message with the file
    const textArea = screen.getByPlaceholderText('Message with attached file...');
    await userEvent.type(textArea, 'Here is a file');
    fireEvent.click(screen.getByText('Send'));
    
    // Verify onSend was called with file attachment
    expect(mockOnSend).toHaveBeenCalledWith(
      'Here is a file',
      undefined,
      expect.objectContaining({
        name: 'test.txt',
        content: 'Sample file content',
        contentType: 'text/plain'
      })
    );
    
    // Verify file was cleared after sending
    expect(screen.queryByText('File:')).not.toBeInTheDocument();
  });

  it('should process CSV files with auto-formatting', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Create a mock CSV file
    const file = new File(['name,age\nJohn,25\nJane,30'], 'data.csv', { type: 'text/csv' });
    
    // Get the file input and trigger a change event
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.getByText('File:')).toBeInTheDocument();
      expect(screen.getByText('data.csv')).toBeInTheDocument();
      // Format should be automatically applied for CSV
      expect(screen.getByText('Format:')).toBeInTheDocument();
      expect(screen.getByText('Table')).toBeInTheDocument();
    });
    
    // Send without typing message (just the file)
    fireEvent.click(screen.getByText('Send'));
    
    // Verify onSend was called with both CSV content and table format
    expect(mockOnSend).toHaveBeenCalledWith(
      '',
      expect.objectContaining({
        type: 'table',
        headers: expect.arrayContaining(['Name', 'Age', 'City'])
      }),
      expect.objectContaining({
        name: 'data.csv',
        contentType: 'text/csv'
      })
    );
  });

  it('should remove attached file', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Attach a file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Wait for file to be processed
    await waitFor(() => {
      expect(screen.getByText('File:')).toBeInTheDocument();
    });
    
    // Click the remove button
    const removeButton = screen.getByTestId('x-mark-icon').closest('button');
    fireEvent.click(removeButton);
    
    // Verify file indicator is removed
    expect(screen.queryByText('File:')).not.toBeInTheDocument();
    
    // Verify placeholder is back to normal
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('should remove active format', async () => {
    render(<ChatInput onSend={mockOnSend} />);
    
    // Apply a format
    const formatButton = screen.getByTestId('table-cells-icon').closest('button');
    fireEvent.click(formatButton);
    fireEvent.click(screen.getByTestId('apply-list-format'));
    
    // Verify format indicator is shown
    expect(screen.getByText('Format:')).toBeInTheDocument();
    
    // Click the remove button
    const removeButton = screen.getByTestId('x-mark-icon').closest('button');
    fireEvent.click(removeButton);
    
    // Verify format indicator is removed
    expect(screen.queryByText('Format:')).not.toBeInTheDocument();
  });

  it('should show loading state when disabled', () => {
    render(<ChatInput onSend={mockOnSend} disabled={true} />);
    
    // Check for loading indicator
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Sending...')).toBeInTheDocument();
    
    // Verify textarea is disabled
    const textArea = screen.getByPlaceholderText('Type your message...');
    expect(textArea).toBeDisabled();
    
    // Verify buttons are disabled
    const formatButton = screen.getByTestId('table-cells-icon').closest('button');
    expect(formatButton).toBeDisabled();
    
    const fileButton = screen.getByTestId('document-text-icon').closest('button');
    expect(fileButton).toBeDisabled();
  });
  
  it('should show resize handle and save height to localStorage', () => {
    const { container } = render(<ChatInput onSend={mockOnSend} />);
    
    // Verify resize handle is present
    const resizeHandle = screen.getByTestId('arrows-updown-icon').closest('div');
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveClass('cursor-ns-resize');
    
    // Simulate resize start
    fireEvent.mouseDown(resizeHandle, { clientY: 100 });
    
    // Simulate mouse movement (dragging upward to increase height)
    fireEvent.mouseMove(document, { clientY: 50 });
    
    // End the resize
    fireEvent.mouseUp(document);
    
    // Verify localStorage was updated with a new height
    expect(window.localStorage.setItem).toHaveBeenCalledWith('chatInputHeight', expect.any(String));
  });
});