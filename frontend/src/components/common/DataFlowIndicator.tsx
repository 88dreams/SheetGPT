import React from 'react';
import { useDataFlow } from '../../contexts/DataFlowContext';
import { useLocation } from 'react-router-dom';

const DataFlowIndicator: React.FC = () => {
  const { dataFlow } = useDataFlow();
  const location = useLocation();
  
  // Determine current section based on URL
  const getCurrentSection = () => {
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/data')) return 'data';
    if (location.pathname.includes('/sports')) return 'sportsdb';
    if (location.pathname.includes('/export')) return 'export';
    return '';
  };
  
  const currentSection = getCurrentSection();
  
  return (
    <div className="data-flow-indicator">
      <div className="flow-steps">
        <div className={`flow-step ${currentSection === 'chat' ? 'active' : ''} ${dataFlow.dataJourney.some(j => j.type === 'chat') ? 'visited' : ''}`}>
          Chat
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'data' ? 'active' : ''} ${dataFlow.currentDestination === 'data' || dataFlow.dataJourney.some(j => j.type === 'manual' || j.type === 'import') ? 'visited' : ''}`}>
          Data
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'sportsdb' ? 'active' : ''} ${dataFlow.currentDestination === 'sportsdb' ? 'visited' : ''}`}>
          Sports DB
        </div>
        <div className="flow-arrow">→</div>
        <div className={`flow-step ${currentSection === 'export' ? 'active' : ''} ${dataFlow.currentDestination === 'export' ? 'visited' : ''}`}>
          Export
        </div>
      </div>
      
      {dataFlow.currentSource && (
        <div className="source-info">
          Source: {dataFlow.currentSource.description}
        </div>
      )}
    </div>
  );
};

export default DataFlowIndicator; 