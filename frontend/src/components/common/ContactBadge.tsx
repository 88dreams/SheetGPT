import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

interface BrandConnection {
  brand_id: string;
  brand_name: string;
  industry?: string;
  company_type?: string;
  first_degree_count: number;
  second_degree_count: number;
  total_connections: number;
}

interface ContactBadgeProps {
  brandId: string;
  className?: string;
  showZero?: boolean;
}

const ContactBadge: React.FC<ContactBadgeProps> = ({
  brandId,
  className = '',
  showZero = false
}) => {
  const { isAuthenticated } = useAuth();
  const [contactCount, setContactCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get contact count for this brand
        const count = await api.linkedin.getBrandContactCount(brandId);
        setContactCount(count);
      } catch (error) {
        console.error('Error fetching brand contact count:', error);
        setContactCount(0);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isAuthenticated, brandId]);

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  // If not authenticated, don't show anything
  if (!isAuthenticated) {
    return null;
  }

  // If no contacts and showZero is false, don't show anything
  if (contactCount === 0 && !showZero) {
    return null;
  }

  // If no contacts but showZero is true, show zero badge
  if (contactCount === 0 && showZero) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        No contacts
      </div>
    );
  }

  // Show contact count badge
  return (
    <div className={`flex items-center ${className}`}>
      {/* Badge */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {/* Contact count */}
        <div className="flex items-center bg-green-600 text-white px-2 py-1">
          <span className="text-xs">{contactCount}</span>
        </div>
      </div>
      
      {/* Label */}
      <div className="ml-2 text-xs text-gray-600">
        {contactCount === 1 ? 'Contact' : 'Contacts'}
      </div>
    </div>
  );
};

export default ContactBadge;