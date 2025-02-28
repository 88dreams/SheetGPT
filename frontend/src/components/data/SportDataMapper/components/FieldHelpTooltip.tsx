import React from 'react';

interface FieldHelpTooltipProps {
  field: string;
  showFieldHelp: string | null;
}

const FieldHelpTooltip: React.FC<FieldHelpTooltipProps> = ({ field, showFieldHelp }) => {
  if (showFieldHelp !== field) return null;
  
  // Get help text based on field name
  const getHelpText = () => {
    switch (field) {
      case 'name':
        return "The name of the entity (e.g., 'Los Angeles Lakers' for a team)";
      case 'league_id':
        return "The UUID of the league this entity belongs to. If you enter a league name, it will be automatically looked up or created.";
      case 'stadium_id':
        return "The UUID of the stadium this entity uses. If you enter a stadium name, it will be automatically looked up or created.";
      case 'team_id':
        return "The UUID of the team this entity belongs to. If you enter a team name, it will be automatically looked up or created.";
      case 'city':
        return "The city where this entity is located.";
      case 'country':
        return "The country where this entity is located.";
      case 'sport':
        return "The sport this entity is associated with (e.g., 'Basketball', 'Football').";
      case 'position':
        return "The position or role (e.g., 'Point Guard', 'Commissioner').";
      case 'date':
        return "The date in YYYY-MM-DD format.";
      case 'start_date':
        return "The start date in YYYY-MM-DD format.";
      case 'end_date':
        return "The end date in YYYY-MM-DD format.";
      default:
        return "Enter the appropriate value for this field.";
    }
  };
  
  return (
    <div className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg p-2 w-64 text-xs text-gray-700 top-full left-0 mt-1">
      {getHelpText()}
    </div>
  );
};

export default FieldHelpTooltip; 