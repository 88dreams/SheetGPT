import React from 'react';

interface FieldHelpTooltipProps {
  fieldName: string;
  onClose: () => void;
}

const FieldHelpTooltip: React.FC<FieldHelpTooltipProps> = ({ fieldName, onClose }) => {
  // Get help text based on field name
  const getHelpText = () => {
    switch (fieldName) {
      case 'name':
        return "The name of the entity (e.g., 'Los Angeles Lakers' for a team)";
      case 'league_id':
        return "The UUID of the league this entity belongs to. If you enter a league name, it will be automatically looked up or created.";
      case 'stadium_id':
        return "The UUID of the stadium this entity uses. If you enter a stadium name, it will be automatically looked up or created.";
      case 'team_id':
        return "The UUID of the team this entity belongs to. If you enter a team name, it will be automatically looked up or created.";
      case 'broadcast_company_id':
        return "The UUID of the broadcast company. This is automatically set when you map a name to the 'name' field, but you can also directly enter a company name here.";
      case 'entity_type':
        return "The type of entity this broadcast right applies to. Valid values include: 'League', 'Conference', 'Division', 'Team', 'Game'. This determines which entity the broadcast rights are for, and works together with entity_id.";
      case 'entity_id':
        return "The UUID of the specific entity this broadcast right applies to, based on the entity_type. You can enter a name (like 'NBA' for a league) and it will be automatically looked up. If you mapped entity_type='Conference' and have division_conference_id filled out, that will be used automatically.";
      case 'division_conference_id':
        return "The UUID of the division or conference. If you enter a division/conference name, it will be automatically looked up.";
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
        return "The start date in YYYY-MM-DD format. You can also enter just a year (e.g., '2020') and it will be converted to January 1st of that year.";
      case 'end_date':
        return "The end date in YYYY-MM-DD format. You can also enter just a year (e.g., '2031') and it will be converted to December 31st of that year.";
      case 'territory':
        return "The geographical territory or region where the broadcast rights apply (e.g., 'United States', 'Europe').";
      case 'is_exclusive':
        return "Whether these broadcast rights are exclusive (true/false).";
      default:
        return "Enter the appropriate value for this field.";
    }
  };
  
  return (
    <div className="fixed z-50 bg-white border border-indigo-200 rounded-md shadow-lg p-4 w-72 text-sm text-gray-700 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-indigo-700 mb-1">{fieldName}</h3>
          <p>{getHelpText()}</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FieldHelpTooltip; 