import React from 'react';
import { useParams } from 'react-router-dom';
import DocumentationBrowser from '../components/docs/DocumentationBrowser';
import PageHeader from '../components/common/PageHeader';

const Documentation: React.FC = () => {
  return (
    <div>
      <PageHeader title="Documentation" description="Browse application documentation" />
      <DocumentationBrowser />
    </div>
  );
};

export default Documentation;