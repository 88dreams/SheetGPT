import { useEffect } from 'react';
import { useDataFlow } from '../../../contexts/DataFlowContext';

export const useDataFlowManager = () => {
  const { setDestination } = useDataFlow();

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('data');
  }, [setDestination]);

  return { setDestination };
};