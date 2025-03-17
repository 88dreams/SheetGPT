import { useEffect } from 'react';
import { useDataFlow } from '../../../contexts/DataFlowContext';

/**
 * A hook that manages DataFlow context integration
 * Sets the destination to 'data' when the component mounts
 */
export const useDataFlowManager = () => {
  const { setDestination } = useDataFlow();

  // Update data flow when component mounts
  useEffect(() => {
    setDestination('data');
  }, [setDestination]);

  return { setDestination };
};