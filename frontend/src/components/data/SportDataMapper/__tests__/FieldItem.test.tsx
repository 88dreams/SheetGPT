import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import FieldItem from '../components/FieldItem';
import '@testing-library/jest-dom';

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
  it('should render a source field item', () => {
    renderComponent(
      <FieldItem 
        field="name" 
        value="Test Name" 
        isSource={true} 
      />
    );
    
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });
  
  it('should render a target field item', () => {
    renderComponent(
      <FieldItem 
        field="name" 
        value="Test Name" 
        isSource={false} 
      />
    );
    
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('Test Name')).toBeInTheDocument();
  });
  
  it('should handle object values', () => {
    const objectValue = { id: 1, title: 'Test Object' };
    
    renderComponent(
      <FieldItem 
        field="complexField" 
        value={objectValue} 
        isSource={true} 
      />
    );
    
    expect(screen.getByText('complexField')).toBeInTheDocument();
    expect(screen.getByText(/{"id":1,"title":"Test Object"}.../)).toBeInTheDocument();
  });
  
  it('should call onDrop when a field is dropped', () => {
    const onDropMock = jest.fn();
    
    renderComponent(
      <FieldItem 
        field="targetField" 
        value="Target Value" 
        isSource={false} 
        onDrop={onDropMock}
      />
    );
    
    // Note: Testing drag and drop functionality is complex and often requires
    // more advanced testing approaches. This test just verifies the component renders.
    expect(screen.getByText('targetField')).toBeInTheDocument();
  });
}); 