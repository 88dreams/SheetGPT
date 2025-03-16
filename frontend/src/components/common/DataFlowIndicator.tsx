import React, { useMemo } from 'react';
import { useDataFlow } from '../../contexts/DataFlowContext';
import { useLocation } from 'react-router-dom';
import { ArrowRightIcon, DocumentIcon } from '@heroicons/react/24/outline';

interface FlowStepProps {
  label: string;
  isActive: boolean;
  isVisited: boolean;
  showArrow?: boolean;
}

/**
 * Flow step component to represent a single stage in the data flow
 */
const FlowStep: React.FC<FlowStepProps> = ({ label, isActive, isVisited, showArrow = true }) => {
  // Determine the appropriate styling based on step status
  const stepClasses = useMemo(() => {
    if (isActive) return 'bg-blue-600 text-white';
    if (isVisited) return 'bg-green-600 text-white';
    return 'bg-gray-200 text-gray-700';
  }, [isActive, isVisited]);

  return (
    <>
      <div className={`px-4 py-2 rounded-md font-medium text-sm ${stepClasses} transition-colors duration-200`}>
        {label}
      </div>
      {showArrow && (
        <div className="text-gray-500 mx-2">
          <ArrowRightIcon className="h-4 w-4" />
        </div>
      )}
    </>
  );
};

/**
 * DataFlowIndicator - Shows the current data flow path through the application
 */
const DataFlowIndicator: React.FC = () => {
  const { dataFlow } = useDataFlow();
  const location = useLocation();

  // Determine current section based on URL
  const currentSection = useMemo(() => {
    if (location.pathname.includes('/chat')) return 'chat';
    if (location.pathname.includes('/data')) return 'data';
    if (location.pathname.includes('/sports')) return 'sportsdb';
    if (location.pathname.includes('/export')) return 'export';
    return '';
  }, [location.pathname]);

  // Define flow steps configuration
  const flowSteps = useMemo(() => [
    {
      id: 'chat',
      label: 'Chat',
      isActive: currentSection === 'chat',
      isVisited: dataFlow.dataJourney.some(j => j.type === 'chat')
    },
    {
      id: 'data',
      label: 'Data',
      isActive: currentSection === 'data',
      isVisited: dataFlow.currentDestination === 'data' || 
                dataFlow.dataJourney.some(j => j.type === 'manual' || j.type === 'import')
    },
    {
      id: 'sportsdb',
      label: 'Sports DB',
      isActive: currentSection === 'sportsdb',
      isVisited: dataFlow.currentDestination === 'sportsdb'
    },
    {
      id: 'export',
      label: 'Export',
      isActive: currentSection === 'export',
      isVisited: dataFlow.currentDestination === 'export'
    }
  ], [currentSection, dataFlow]);
  
  return (
    <div className="bg-gray-50 rounded-lg p-3 mb-5 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        {flowSteps.map((step, index) => (
          <FlowStep
            key={step.id}
            label={step.label}
            isActive={step.isActive}
            isVisited={step.isVisited}
            showArrow={index < flowSteps.length - 1}
          />
        ))}
      </div>
      
      {dataFlow.currentSource && (
        <div className="mt-2 text-sm text-gray-600 flex items-center">
          <DocumentIcon className="h-4 w-4 mr-1" />
          <span>Source: {dataFlow.currentSource.description}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(DataFlowIndicator); 