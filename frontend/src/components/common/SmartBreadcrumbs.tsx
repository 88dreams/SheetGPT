import React from 'react';
import { Link } from 'react-router-dom';
import { useDataFlow } from '../../contexts/DataFlowContext';

const SmartBreadcrumbs: React.FC = () => {
  const { dataFlow } = useDataFlow();
  
  if (dataFlow.dataJourney.length === 0) {
    return null; // Don't show breadcrumbs if there's no journey
  }
  
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {dataFlow.dataJourney.map((source, index) => {
          let url = '/';
          let label = '';
          
          switch (source.type) {
            case 'chat':
              url = `/chat/${source.id}`;
              label = `Chat: ${source.description}`;
              break;
            case 'manual':
              url = `/data`;
              label = `Manual: ${source.description}`;
              break;
            case 'import':
              url = `/data`;
              label = `Import: ${source.description}`;
              break;
            default:
              label = `${source.type}: ${source.description}`;
              break;
          }
          
          return (
            <li key={index} className="breadcrumb-item">
              {index < dataFlow.dataJourney.length - 1 ? (
                <Link to={url}>{label}</Link>
              ) : (
                <span>{label}</span>
              )}
            </li>
          );
        })}
        
        {dataFlow.currentDestination && (
          <li className="breadcrumb-item active">
            {dataFlow.currentDestination === 'data' && 'Data Management'}
            {dataFlow.currentDestination === 'sportsdb' && 'Sports Database'}
            {dataFlow.currentDestination === 'export' && 'Export'}
          </li>
        )}
      </ol>
    </nav>
  );
};

export default SmartBreadcrumbs; 