import React from 'react';
import SportsDatabase from '../components/sports/database/SportsDatabase';
import usePageTitle from '../hooks/usePageTitle';

const SportsDatabasePage: React.FC = () => {
  // Set the page title
  usePageTitle('Sports Database');
  
  return <SportsDatabase />;
};

export default SportsDatabasePage; 