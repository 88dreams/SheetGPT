import React, { ReactNode } from 'react';
import PageHeader from './PageHeader';

interface PageContainerProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`page-container ${className}`}>
      <PageHeader 
        title={title} 
        description={description} 
        actions={actions} 
      />
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer; 