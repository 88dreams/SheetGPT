import React from 'react';
import { render, screen } from '@testing-library/react';
import { withMemo, withMemoForwardRef, withListItemMemo, withRowMemo, withFormMemo } from '../memoization';

// Test components
const SimpleComponent = ({ text }: { text: string }) => {
  return <div data-testid="simple-component">{text}</div>;
};

const ForwardRefComponent = React.forwardRef<HTMLDivElement, { text: string }>(
  (props, ref) => <div ref={ref} data-testid="ref-component">{props.text}</div>
);

const ListItemComponent = ({ index, text }: { index: number; text: string }) => {
  return <div data-testid={`list-item-${index}`}>{text}</div>;
};

const RowComponent = ({ entity, onSelect }: { entity: { id: string; name: string }; onSelect: () => void }) => {
  return <div data-testid={`row-${entity.id}`} onClick={onSelect}>{entity.name}</div>;
};

const FormComponent = ({ 
  values, 
  onChange, 
  onSubmit 
}: { 
  values: { name: string; email: string }; 
  onChange: (field: string, value: string) => void; 
  onSubmit: () => void 
}) => {
  return (
    <form data-testid="form-component" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <input 
        type="text" 
        value={values.name} 
        onChange={(e) => onChange('name', e.target.value)} 
        data-testid="name-input" 
      />
      <input 
        type="email" 
        value={values.email} 
        onChange={(e) => onChange('email', e.target.value)} 
        data-testid="email-input" 
      />
    </form>
  );
};

// Tests
describe('memoization utilities', () => {
  beforeAll(() => {
    // Mock the NODE_ENV to production to ensure memoization is applied
    process.env.NODE_ENV = 'production';
  });

  describe('withMemo', () => {
    it('should create a memoized component with displayName', () => {
      const MemoizedComponent = withMemo(SimpleComponent, { displayName: 'CustomMemoSimple' });
      expect(MemoizedComponent.displayName).toBe('CustomMemoSimple');
      
      // Render the component to ensure it works
      render(<MemoizedComponent text="Hello" />);
      expect(screen.getByTestId('simple-component')).toHaveTextContent('Hello');
    });
    
    it('should use default displayName when not provided', () => {
      const MemoizedComponent = withMemo(SimpleComponent);
      expect(MemoizedComponent.displayName).toBe('WithMemo(SimpleComponent)');
    });
  });
  
  describe('withMemoForwardRef', () => {
    it('should create a memoized component that forwards refs', () => {
      const ref = React.createRef<HTMLDivElement>();
      const MemoizedRefComponent = withMemoForwardRef(ForwardRefComponent);
      
      render(<MemoizedRefComponent ref={ref} text="Ref Text" />);
      expect(screen.getByTestId('ref-component')).toHaveTextContent('Ref Text');
      expect(ref.current).not.toBeNull();
      expect(ref.current?.tagName).toBe('DIV');
    });
    
    it('should have proper displayName', () => {
      const MemoizedRefComponent = withMemoForwardRef(ForwardRefComponent);
      expect(MemoizedRefComponent.displayName).toContain('ForwardRef');
    });
  });
  
  describe('withListItemMemo', () => {
    it('should create a memoized list item component', () => {
      const MemoizedListItem = withListItemMemo(ListItemComponent);
      
      render(<MemoizedListItem index={1} text="Item 1" />);
      expect(screen.getByTestId('list-item-1')).toHaveTextContent('Item 1');
    });
    
    it('should have a list item specific displayName', () => {
      const MemoizedListItem = withListItemMemo(ListItemComponent);
      expect(MemoizedListItem.displayName).toContain('MemoListItem');
    });
  });
  
  describe('withRowMemo', () => {
    it('should create a memoized row component', () => {
      const handleSelect = jest.fn();
      const MemoizedRow = withRowMemo(RowComponent);
      
      render(
        <MemoizedRow 
          entity={{ id: '123', name: 'Test Entity' }} 
          onSelect={handleSelect} 
        />
      );
      
      expect(screen.getByTestId('row-123')).toHaveTextContent('Test Entity');
    });
    
    it('should have a row specific displayName', () => {
      const MemoizedRow = withRowMemo(RowComponent);
      expect(MemoizedRow.displayName).toContain('MemoRow');
    });
  });
  
  describe('withFormMemo', () => {
    it('should create a memoized form component', () => {
      const handleChange = jest.fn();
      const handleSubmit = jest.fn();
      const MemoizedForm = withFormMemo(FormComponent);
      
      render(
        <MemoizedForm 
          values={{ name: 'John', email: 'john@example.com' }} 
          onChange={handleChange} 
          onSubmit={handleSubmit} 
        />
      );
      
      expect(screen.getByTestId('name-input')).toHaveValue('John');
      expect(screen.getByTestId('email-input')).toHaveValue('john@example.com');
    });
    
    it('should have a form specific displayName', () => {
      const MemoizedForm = withFormMemo(FormComponent);
      expect(MemoizedForm.displayName).toContain('MemoForm');
    });
  });
});