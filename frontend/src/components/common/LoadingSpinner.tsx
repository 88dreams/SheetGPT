import React, { useMemo } from 'react'

type SpinnerSize = 'small' | 'medium' | 'large' | 'custom';
type SpinnerColor = 'current' | 'blue' | 'gray' | 'white' | 'green';
type SpinnerThickness = 'thin' | 'normal' | 'thick';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  thickness?: SpinnerThickness;
  customSize?: string;
  className?: string;
  label?: string;
}

/**
 * LoadingSpinner - A reusable loading spinner component with customizable size, color, and thickness
 * 
 * @param size - Predefined size ('small', 'medium', 'large') or 'custom' to use customSize
 * @param color - Color of the spinner ('current', 'blue', 'gray', 'white', 'green')
 * @param thickness - Border thickness ('thin', 'normal', 'thick')
 * @param customSize - Custom size classes when size="custom" (e.g., "w-12 h-12")
 * @param className - Additional CSS classes
 * @param label - Accessible label for screen readers (defaults to "Loading...")
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'current',
  thickness = 'normal',
  customSize,
  className = '',
  label = 'Loading...',
}) => {
  const sizeClasses = useMemo(() => ({
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    custom: customSize || 'w-4 h-4', // Fallback if customSize not provided
  }), [customSize]);

  const colorClasses = useMemo(() => ({
    current: 'border-current',
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white',
    green: 'border-green-600',
  }), []);
  
  const thicknessClasses = useMemo(() => ({
    thin: 'border',
    normal: 'border-2',
    thick: 'border-4',
  }), []);

  // Build transparent border class based on color
  const transparentBorderClass = useMemo(() => {
    switch (color) {
      case 'current': return 'border-r-transparent';
      case 'blue': return 'border-r-transparent';
      case 'gray': return 'border-r-transparent';
      case 'white': return 'border-r-transparent';
      case 'green': return 'border-r-transparent';
      default: return 'border-r-transparent';
    }
  }, [color]);

  return (
    <div 
      className={`
        inline-block animate-spin rounded-full 
        ${thicknessClasses[thickness]} 
        border-solid 
        ${colorClasses[color]} 
        ${transparentBorderClass} 
        ${sizeClasses[size]} 
        ${className}
      `} 
      role="status"
      aria-label={label}
    >
      <span className="sr-only">{label}</span>
    </div>
  )
}

export default React.memo(LoadingSpinner) 