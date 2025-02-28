import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import FieldHelpTooltip from '../components/FieldHelpTooltip';
import '@testing-library/jest-dom';

describe('FieldHelpTooltip', () => {
  it('should not render when showFieldHelp does not match field', () => {
    render(
      <FieldHelpTooltip 
        field="name"
        showFieldHelp="city" // Different field
      />
    );
    
    // The component should not render anything
    const tooltipText = screen.queryByText(/The name of the entity/i);
    expect(tooltipText).not.toBeInTheDocument();
  });
  
  it('should not render when showFieldHelp is null', () => {
    render(
      <FieldHelpTooltip 
        field="name"
        showFieldHelp={null}
      />
    );
    
    // The component should not render anything
    const tooltipText = screen.queryByText(/The name of the entity/i);
    expect(tooltipText).not.toBeInTheDocument();
  });
  
  it('should render help text for name field', () => {
    render(
      <FieldHelpTooltip 
        field="name"
        showFieldHelp="name" // Matching field
      />
    );
    
    // Should render help text for name field
    const tooltipText = screen.getByText(/The name of the entity/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for league_id field', () => {
    render(
      <FieldHelpTooltip 
        field="league_id"
        showFieldHelp="league_id" // Matching field
      />
    );
    
    // Should render help text for league_id field
    const tooltipText = screen.getByText(/The UUID of the league this entity belongs to/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for stadium_id field', () => {
    render(
      <FieldHelpTooltip 
        field="stadium_id"
        showFieldHelp="stadium_id" // Matching field
      />
    );
    
    // Should render help text for stadium_id field
    const tooltipText = screen.getByText(/The UUID of the stadium this entity uses/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for team_id field', () => {
    render(
      <FieldHelpTooltip 
        field="team_id"
        showFieldHelp="team_id" // Matching field
      />
    );
    
    // Should render help text for team_id field
    const tooltipText = screen.getByText(/The UUID of the team this entity belongs to/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render help text for city field', () => {
    render(
      <FieldHelpTooltip 
        field="city"
        showFieldHelp="city" // Matching field
      />
    );
    
    // Should render help text for city field
    const tooltipText = screen.getByText(/The city where this entity is located/i);
    expect(tooltipText).toBeInTheDocument();
  });
  
  it('should render default help text for unknown field', () => {
    render(
      <FieldHelpTooltip 
        field="unknown_field"
        showFieldHelp="unknown_field" // Matching field
      />
    );
    
    // Should render default help text
    const tooltipText = screen.getByText(/Enter the appropriate value for this field/i);
    expect(tooltipText).toBeInTheDocument();
  });
}); 