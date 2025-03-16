import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataFlow } from '../../contexts/DataFlowContext';

// Define types for source/journey items
interface JourneySource {
  id?: string;
  type: string;
  description: string;
}

interface BreadcrumbItemProps {
  label: string;
  url?: string;
  isActive?: boolean;
}

// Extract breadcrumb item as a separate component
const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({ label, url, isActive = false }) => {
  return (
    <li className={`breadcrumb-item${isActive ? ' active' : ''}`}>
      {isActive ? (
        <span>{label}</span>
      ) : url ? (
        <Link to={url}>{label}</Link>
      ) : (
        <span>{label}</span>
      )}
    </li>
  );
};

const SmartBreadcrumbs: React.FC = () => {
  const { dataFlow } = useDataFlow();
  
  // Map destination keys to display labels
  const destinationLabels = useMemo(() => ({
    'data': 'Data Management',
    'sportsdb': 'Sports Database',
    'export': 'Export'
  }), []);

  // Early return if no journey data
  if (!dataFlow?.dataJourney?.length) {
    return null;
  }
  
  // Function to determine URL and label based on source type
  const getSourceInfo = (source: JourneySource) => {
    let url = '/';
    let label = '';
    
    switch (source.type) {
      case 'chat':
        url = `/chat/${source.id}`;
        label = `Chat: ${source.description}`;
        break;
      case 'manual':
      case 'import':
        url = `/data`;
        label = `${source.type.charAt(0).toUpperCase() + source.type.slice(1)}: ${source.description}`;
        break;
      default:
        label = `${source.type}: ${source.description}`;
        break;
    }
    
    return { url, label };
  };
  
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb">
        {dataFlow.dataJourney.map((source, index) => {
          const { url, label } = getSourceInfo(source);
          const isLast = index === dataFlow.dataJourney.length - 1;
          
          return (
            <BreadcrumbItem 
              key={`${source.type}-${index}`}
              label={label}
              url={isLast ? undefined : url}
            />
          );
        })}
        
        {dataFlow.currentDestination && (
          <BreadcrumbItem
            label={destinationLabels[dataFlow.currentDestination] || dataFlow.currentDestination}
            isActive={true}
          />
        )}
      </ol>
    </nav>
  );
};

export default React.memo(SmartBreadcrumbs); 