import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import FieldHelpTooltip from '../components/FieldHelpTooltip';
import '@testing-library/jest-dom';

describe('FieldHelpTooltip', () => {
  it('should not render when showFieldHelp does not match field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="name"
        onClose={() => {}}
      />
    );
    
    // The component should not render anything
    const tooltipText = screen.queryByText(/The name of the entity/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for name field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="name"
        onClose={() => {}}
      />
    );
    
    // Should render help text for name field
    const tooltipText = screen.getByText(/The name of the entity/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for league_id field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="league_id"
        onClose={() => {}}
      />
    );
    
    // Should render help text for league_id field
    const tooltipText = screen.getByText(/The UUID of the league this entity belongs to/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for stadium_id field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="stadium_id"
        onClose={() => {}}
      />
    );
    
    // Should render help text for stadium_id field
    const tooltipText = screen.getByText(/The UUID of the stadium this entity uses/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for team_id field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="team_id"
        onClose={() => {}}
      />
    );
    
    // Should render help text for team_id field
    const tooltipText = screen.getByText(/The UUID of the team this entity belongs to/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for city field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="city"
        onClose={() => {}}
      />
    );
    
    // Should render help text for city field
    const tooltipText = screen.getByText(/The city where this entity is located/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render default help text for unknown field', () => {
    render(
      <FieldHelpTooltip 
        fieldName="unknown_field"
        onClose={() => {}}
      />
    );
    
    // Should render default help text
    const tooltipText = screen.getByText(/Enter the appropriate value for this field/i);
    expect(tooltipText).toBeInTheDocument();
  });
}); 