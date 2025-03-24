// This file is imported in jest.config.js as setupFilesAfterEnv
import '@testing-library/jest-dom';

// Modules with import.meta.env are mocked in moduleNameMapper config

// Mock console.error to filter out specific warnings
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out act() warnings
  if (
    args[0] && 
    typeof args[0] === 'string' && 
    args[0].includes('Warning: An update to') && 
    args[0].includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

// Mock react-dnd
jest.mock('react-dnd', () => ({
  DndProvider: ({ children }: { children: React.ReactNode }) => children,
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));

jest.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {}
}));

// Mock @headlessui/react Dialog component with all necessary subcomponents
jest.mock('@headlessui/react', () => {
  const React = require('react');
  const Dialog = ({ children, open, onClose, ...props }: { children: React.ReactNode, open?: boolean, onClose?: () => void }) => {
    if (!open) return null;
    return React.createElement('div', { role: 'dialog', ...props }, children);
  };
  
  // Add subcomponents to Dialog
  Dialog.Panel = ({ children, ...props }: { children: React.ReactNode }) => 
    React.createElement('div', props, children);
  Dialog.Title = ({ children, ...props }: { children: React.ReactNode }) => 
    React.createElement('h2', props, children);
  Dialog.Overlay = ({ children, ...props }: { children: React.ReactNode }) => 
    React.createElement('div', props, children);
  Dialog.Description = ({ children, ...props }: { children: React.ReactNode }) => 
    React.createElement('div', props, children);
  
  return {
    Dialog,
    Transition: {
      Child: ({ children }: { children: React.ReactNode }) => children,
      Root: ({ children, show }: { children: React.ReactNode, show?: boolean }) => {
        if (!show) return null;
        return children;
      }
    },
    Menu: {
      Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
      Items: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
      Item: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
    },
    Listbox: {
      Button: ({ children }: { children: React.ReactNode }) => React.createElement('button', null, children),
      Options: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
      Option: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children)
    }
  };
});