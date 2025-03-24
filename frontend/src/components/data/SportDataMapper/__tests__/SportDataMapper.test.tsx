import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import SportDataMapper from '../../SportDataMapper';
import SportDataMapperContainer from '../index';
import { StandardDataFormat } from '../../../../utils/dataTransformer';

// Mock the SportDataMapperContainer component
jest.mock('../index', () => {
  return jest.fn(() => <div data-testid="mock-container">Mocked Container</div>);
});

describe('SportDataMapper', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  it('should render SportDataMapperContainer with passed props', () => {
    // Define test props with proper StandardDataFormat
    const testProps = {
      data: {
        headers: ['name', 'type'],
        rows: [['Team A', 'team'], ['Team B', 'team']]
      } as StandardDataFormat,
      onConfirm: jest.fn(),
      onClose: jest.fn()
    };

    // Render the component
    render(<SportDataMapper {...testProps} />);

    // Check if SportDataMapperContainer was called with the correct props
    expect(SportDataMapperContainer).toHaveBeenCalledTimes(1);
    expect(SportDataMapperContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function),
        structuredData: testProps.data
      }),
      expect.anything()
    );
  });

  it('should pass onClose callback to SportDataMapperContainer', () => {
    // Define test props with a mock onClose function
    const onCloseMock = jest.fn();
    const testProps = {
      data: {
        headers: ['name', 'type'],
        rows: [['Team A', 'team'], ['Team B', 'team']]
      } as StandardDataFormat,
      onConfirm: jest.fn(),
      onClose: onCloseMock
    };

    // Render the component
    render(<SportDataMapper {...testProps} />);

    // Extract the onClose prop that was passed to SportDataMapperContainer
    const passedProps = (SportDataMapperContainer as jest.Mock).mock.calls[0][0] as {
      onClose: () => void;
      isOpen: boolean;
      structuredData: StandardDataFormat;
    };
    
    // Call the onClose function
    passedProps.onClose();
    
    // Check if the original onClose mock was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
}); 