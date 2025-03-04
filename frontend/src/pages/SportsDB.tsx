import React, { useState } from 'react';
import { Tabs } from 'antd';
import SportDataMapperContainer from '../components/data/SportDataMapper/SportDataMapperContainer';
import EntityUpdateContainer from '../components/data/EntityUpdate/EntityUpdateContainer';
import { TabsProps } from 'antd';

interface StructuredData {
  type: string;
  data: Record<string, any>[];
  mapping?: Record<string, string>;
}

const SportsDB: React.FC = () => {
  const [isMapperOpen, setIsMapperOpen] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredData | null>(null);

  const handleMapperClose = () => {
    setIsMapperOpen(false);
    setStructuredData(null);
  };

  const items: TabsProps['items'] = [
    {
      key: 'import',
      label: 'Data Import',
      children: (
        <SportDataMapperContainer
          isOpen={isMapperOpen}
          onClose={handleMapperClose}
          structuredData={structuredData}
        />
      ),
    },
    {
      key: 'update',
      label: 'Update Records',
      children: <EntityUpdateContainer />,
    },
  ];

  return (
    <Tabs
      defaultActiveKey="import"
      items={items}
    />
  );
};

export default SportsDB; 