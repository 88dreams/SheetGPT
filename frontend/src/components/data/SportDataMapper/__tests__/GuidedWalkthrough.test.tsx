// import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import GuidedWalkthrough from '../components/GuidedWalkthrough';

describe('GuidedWalkthrough', () => {
  it('should not render when showGuidedWalkthrough is false', () => {
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={false}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={1}
        setGuidedStep={jest.fn()}
      />
    );
    
    // The component should not render anything
    expect(screen.queryByText(/Select an Entity Type/i)).not.toBeInTheDocument();
  });
  
  it('should render step 1 content when guidedStep is 1', () => {
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={1}
        setGuidedStep={jest.fn()}
      />
    );
    
    expect(screen.getByText(/Step 1: Select an Entity Type/i)).toBeInTheDocument();
    expect(screen.getByText(/Choose the type of sports data/i)).toBeInTheDocument();
    
    // Previous button should be disabled in step 1
    const previousButton = screen.getByText(/Previous/i);
    expect(previousButton).toHaveClass('bg-gray-100');
    expect(previousButton).toHaveClass('cursor-not-allowed');
    
    // Next button should be enabled
    const nextButton = screen.getByText(/Next/i);
    expect(nextButton).toHaveClass('bg-indigo-600');
  });
  
  it('should render step 2 content when guidedStep is 2', () => {
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={2}
        setGuidedStep={jest.fn()}
      />
    );
    
    expect(screen.getByText(/Step 2: Map Your Fields/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag fields from the Source Fields/i)).toBeInTheDocument();
    
    // Previous button should be enabled in step 2
    const previousButton = screen.getByText(/Previous/i);
    expect(previousButton).not.toHaveClass('cursor-not-allowed');
    
    // Next button should be enabled
    const nextButton = screen.getByText(/Next/i);
    expect(nextButton).toHaveClass('bg-indigo-600');
  });
  
  it('should call setShowGuidedWalkthrough when close button is clicked', () => {
    const mockSetShowGuidedWalkthrough = jest.fn();
    
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={mockSetShowGuidedWalkthrough}
        guidedStep={1}
        setGuidedStep={jest.fn()}
      />
    );
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: '' }); // The X button has no text
    fireEvent.click(closeButton);
    
    expect(mockSetShowGuidedWalkthrough).toHaveBeenCalledWith(false);
  });
  
  it('should call setGuidedStep when Next button is clicked', () => {
    const mockSetGuidedStep = jest.fn();
    
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={1}
        setGuidedStep={mockSetGuidedStep}
      />
    );
    
    // Find and click the Next button
    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);
    
    expect(mockSetGuidedStep).toHaveBeenCalled();
  });
  
  it('should call setGuidedStep when Previous button is clicked', () => {
    const mockSetGuidedStep = jest.fn();
    
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={2}
        setGuidedStep={mockSetGuidedStep}
      />
    );
    
    // Find and click the Previous button
    const previousButton = screen.getByText(/Previous/i);
    fireEvent.click(previousButton);
    
    expect(mockSetGuidedStep).toHaveBeenCalled();
  });
  
  it('should show Finish button on the last step', () => {
    render(
      <GuidedWalkthrough 
        showGuidedWalkthrough={true}
        setShowGuidedWalkthrough={jest.fn()}
        guidedStep={4} // Last step
        setGuidedStep={jest.fn()}
      />
    );
    
    expect(screen.getByText(/Finish/i)).toBeInTheDocument();
  });
}); 