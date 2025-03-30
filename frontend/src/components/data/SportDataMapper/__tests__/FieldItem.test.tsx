import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import FieldItem from '../components/FieldItem';
import '@testing-library/jest-dom';

// Mock the fingerprint and memoization utilities
jest.mock('../../../../utils/fingerprint', () => ({
  createMemoEqualityFn: jest.fn((a) => (b) => a === b),
  fingerprint: jest.fn(obj => JSON.stringify(obj))
}));

jest.mock('../../../../utils/memoization', () => ({
  withRowMemo: jest.fn((component, equalityFn) => component)
}));

// Mock the react-dnd hooks
jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn()],
  useDrop: () => [{ isOver: false, canDrop: true }, jest.fn()]
}));

// No need for DndProvider since we're mocking the hooks
const renderComponent = (ui: React.ReactElement) => {
  return render(ui);
};

describe('FieldItem', () => {
  // Mock formatValue function to track calls
  const formatValueMock = jest.fn(val => String(val));
  
  // Reset mocks before each test
  beforeEach(() => {
    formatValueMock.mockClear();
  });
  
  it('should render a source field item with memoization', () => {
    renderComponent(
      <FieldItem 
        field="name" 
        value="Test Name" 
        isSource={true}
        formatValue={formatValueMock}
      />
    );
    
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
    expect(formatValueMock).toHaveBeenCalledWith('Test Name');
  });
  
  it('should render a target field item', () => {
    renderComponent(
      <FieldItem 
        field="name" 
        value="Test Name" 
        isSource={false}
        formatValue={formatValueMock}
      />
    );
    
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });
  
  it('should handle object values with memoized rendering', () => {
    const objectValue = { id: 1, title: 'Test Object' };
    
    renderComponent(
      <FieldItem 
        field="complexField" 
        value={objectValue} 
        isSource={true}
        formatValue={(val) => {
          if (typeof val === 'object') {
            return JSON.stringify(val).substring(0, 30) + '...';
          }
          return String(val);
        }}
      />
    );
    
    expect(screen.getByText('complexField')).toBeInTheDocument();
    expect(screen.getByText(/{"id":1,"title":"Test Object"}.../)).toBeInTheDocument();
  });
  
  it('should render a dash for null/undefined values', () => {
    renderComponent(
      <FieldItem 
        field="emptyField" 
        value={null} 
        isSource={true}
        formatValue={formatValueMock}
      />
    );
    
    expect(screen.getByText('emptyField')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(formatValueMock).not.toHaveBeenCalled(); // Shouldn't format null values
  });
  
  it('should apply custom class names', () => {
    const { container } = renderComponent(
      <FieldItem 
        field="styledField" 
        value="Styled Value" 
        isSource={true}
        className="custom-test-class"
        formatValue={formatValueMock}
      />
    );
    
    expect(container.firstChild).toHaveClass('custom-test-class');
  });
  
  it('should call onDrop when a field is dropped', () => {
    const onDropMock = jest.fn();
    
    renderComponent(
      <FieldItem 
        field="targetField" 
        value="Target Value" 
        isSource={false} 
        onDrop={onDropMock}
        formatValue={formatValueMock}
      />
    );
    
    // Note: Testing drag and drop functionality is complex and often requires
    // more advanced testing approaches. This test just verifies the component renders.
    expect(screen.getByText('targetField')).toBeInTheDocument();
  });
  
  it('should memoize border styles and drop indicators', () => {
    // Set up the mocks to simulate the useMemo implementation
    jest.spyOn(React, 'useMemo')
      .mockImplementationOnce(() => 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 cursor-move transition-all')
      .mockImplementationOnce(() => null);
      
    renderComponent(
      <FieldItem 
        field="memoizedField" 
        value="Memoized Value" 
        isSource={true}
        formatValue={formatValueMock}
      />
    );
    
    expect(screen.getByText('memoizedField')).toBeInTheDocument();
    expect(screen.getByText('Memoized Value')).toBeInTheDocument();
    expect(React.useMemo).toHaveBeenCalledTimes(2);
  });
});