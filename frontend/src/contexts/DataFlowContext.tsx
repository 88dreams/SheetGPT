import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DataSource {
  type: 'chat' | 'manual' | 'import';
  id?: string; // Message ID, import ID, etc.
  timestamp: Date;
  description: string;
}

interface DataFlowState {
  currentSource?: DataSource;
  currentData?: any;
  currentDestination?: 'data' | 'sportsdb' | 'export';
  dataJourney: DataSource[];
}

interface DataFlowContextType {
  dataFlow: DataFlowState;
  setSource: (source: DataSource) => void;
  setData: (data: any) => void;
  setDestination: (destination: 'data' | 'sportsdb' | 'export') => void;
  resetFlow: () => void;
  addToJourney: (source: DataSource) => void;
}

const DataFlowContext = createContext<DataFlowContextType | undefined>(undefined);

export const DataFlowProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [dataFlow, setDataFlow] = useState<DataFlowState>({
    dataJourney: []
  });

  const setSource = (source: DataSource) => {
    setDataFlow(prev => ({ ...prev, currentSource: source }));
  };

  const setData = (data: any) => {
    setDataFlow(prev => ({ ...prev, currentData: data }));
  };

  const setDestination = (destination: 'data' | 'sportsdb' | 'export') => {
    setDataFlow(prev => ({ ...prev, currentDestination: destination }));
  };

  const resetFlow = () => {
    setDataFlow({ dataJourney: [] });
  };

  const addToJourney = (source: DataSource) => {
    setDataFlow(prev => ({
      ...prev,
      dataJourney: [...prev.dataJourney, source]
    }));
  };

  return (
    <DataFlowContext.Provider value={{ 
      dataFlow, 
      setSource, 
      setData, 
      setDestination, 
      resetFlow,
      addToJourney
    }}>
      {children}
    </DataFlowContext.Provider>
  );
};

export const useDataFlow = () => {
  const context = useContext(DataFlowContext);
  if (context === undefined) {
    throw new Error('useDataFlow must be used within a DataFlowProvider');
  }
  return context;
}; 