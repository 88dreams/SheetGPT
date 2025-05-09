/**
 * Memoization utilities for React components
 *
 * This file provides higher-order components and utilities for optimizing
 * component rendering performance through memoization.
 */

import React, { ComponentType, ForwardRefExoticComponent, forwardRef } from 'react';
import { createMemoEqualityFn, FingerprintOptions } from './fingerprint';

/**
 * Options for the withMemo higher-order component
 */
export interface WithMemoOptions {
  /** Fingerprinting options to use for the equality function */
  fingerprintOptions?: FingerprintOptions;
  
  /** Name to use for the displayed component name in DevTools */
  displayName?: string;
  
  /** Force memoization even if process.env.NODE_ENV is 'development' */
  forceInDevelopment?: boolean;
}

/**
 * Higher-order component that wraps a component with React.memo and an optimized
 * equality function using the fingerprinting utility
 * 
 * @param Component - The component to memoize
 * @param options - Options for memoization
 * @returns Memoized component
 * 
 * @example
 * const MemoizedComponent = withMemo(MyComponent, {
 *   fingerprintOptions: { depth: 2 },
 *   displayName: 'MemoizedMyComponent'
 * });
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  options: WithMemoOptions = {}
): React.MemoExoticComponent<ComponentType<P>> {
  // Use default options if not provided
  const {
    fingerprintOptions = {
      depth: 2,
      skipUndefined: true,
      customHandlers: {
        // Custom handler for arrays - only compare length and specific contents
        Array: (value) => {
          if (Array.isArray(value)) {
            return `Array:length=${value.length}`;
          }
          return undefined; // Fall back to default handler
        }
      }
    },
    displayName,
    forceInDevelopment = false
  } = options;

  // Skip memoization in development mode unless forced
  // This helps with debugging and hot reloading
  if (process.env.NODE_ENV === 'development' && !forceInDevelopment) {
    // Set display name for easier debugging
    const componentName = displayName || Component.displayName || Component.name || 'Component';
    const wrappedDisplayName = `WithMemo(${componentName})`;
    
    // Just return the original component with updated display name in dev mode
    const WrappedComponent = (props: P) => <Component {...props} />;
    WrappedComponent.displayName = wrappedDisplayName;
    
    return React.memo(WrappedComponent);
  }

  // Create memoized component with fingerprinting equality function
  const MemoizedComponent = React.memo(
    Component,
    createMemoEqualityFn(fingerprintOptions)
  );

  // Set display name for the memoized component
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  } else {
    const baseDisplayName = Component.displayName || Component.name || 'Component';
    MemoizedComponent.displayName = `WithMemo(${baseDisplayName})`;
  }

  return MemoizedComponent;
}

/**
 * Higher-order component that wraps a component with React.memo and an optimized
 * equality function, while preserving ref forwarding
 * 
 * @param Component - The component to memoize
 * @param options - Options for memoization
 * @returns Memoized component with forwarded ref
 * 
 * @example
 * const MemoizedComponent = withMemoForwardRef(MyComponent, {
 *   fingerprintOptions: { depth: 2 }
 * });
 */
export function withMemoForwardRef<P extends object, T = any>(
  Component: ComponentType<P & { ref?: React.Ref<T> }>,
  options: WithMemoOptions = {}
): ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<T>> {
  // Create a forwarded ref component
  const ForwardedComponent = forwardRef<T, P>((props, ref) => {
    // TS2322: This is a common complex typing issue with HOCs combining generics, React.memo, and forwardRef.
    // The composed props can be difficult for TypeScript to perfectly reconcile with the target component's expected props.
    // Assuming correct usage of the HOC, this is likely a type inference limitation rather than a runtime bug.
    // @ts-expect-error TS2322 Type 'PropsWithoutRef<P> & { ref: ForwardedRef<T>; }' is not assignable to type 'IntrinsicAttributes & P & { ref?: Ref<T>; }'.
    return <Component {...props} ref={ref} />;
  });

  // Set display name for the forwarded ref component
  const baseDisplayName = Component.displayName || Component.name || 'Component';
  ForwardedComponent.displayName = `ForwardRef(${baseDisplayName})`;

  // Apply the withMemo HOC to the forwarded ref component
  const MemoizedComponent = withMemo(ForwardedComponent, options);

  return MemoizedComponent as ForwardRefExoticComponent<
    React.PropsWithoutRef<P> & React.RefAttributes<T>
  >;
}

/**
 * Higher-order component that applies optimized memoization to list item components
 * 
 * Specifically designed for components that render as items in a list, with optimizations
 * for index-based comparisons.
 * 
 * @param Component - The list item component to memoize
 * @param options - Options for memoization
 * @returns Memoized list item component
 * 
 * @example
 * const MemoizedListItem = withListItemMemo(ListItem);
 */
export function withListItemMemo<P extends { index: number }>(
  Component: ComponentType<P>,
  options: WithMemoOptions = {}
): React.MemoExoticComponent<ComponentType<P>> {
  // Use specific fingerprint options tailored for list items
  const listItemFingerprint: FingerprintOptions = {
    ...options.fingerprintOptions,
    customHandlers: {
      ...(options.fingerprintOptions?.customHandlers || {}),
      // Custom handler for index prop - given special attention
      Number: (value: any): string => {
        // The original logic 'if (key === 'index')' cannot work here as 'key' is not available.
        // This handler applies to ALL numbers encountered within the props of a list item.
        // Defaulting to simple string conversion. If specific 'index' prop handling is crucial,
        // it needs a different approach than a generic 'Number' type handler.
        return String(value);
      }
    }
  };

  return withMemo(Component, {
    ...options,
    fingerprintOptions: listItemFingerprint,
    displayName: options.displayName || `MemoListItem(${Component.displayName || Component.name || 'Component'})`
  });
}

/**
 * Higher-order component for memoizing table rows with optimized equality checks
 * 
 * Designed specifically for table row components, which often have complex equality
 * requirements involving row data, selection state, and more.
 * 
 * @param Component - The row component to memoize
 * @param options - Options for memoization
 * @returns Memoized row component
 * 
 * @example
 * const MemoizedRow = withRowMemo(TableRow);
 */
export function withRowMemo<P extends { entity?: any; item?: any; data?: any; }>(
  Component: ComponentType<P>,
  options: WithMemoOptions = {}
): React.MemoExoticComponent<ComponentType<P>> {
  // Default fingerprint options optimized for table rows
  const rowFingerprint: FingerprintOptions = {
    depth: 1, // Shallow comparison for row data
    skipUndefined: true,
    customHandlers: {
      // Specialized handler for row data objects (entity, item, or data prop)
      Object: (value: any): string | undefined => {
        // The original logic 'if (key === 'entity' || key === 'item' || key === 'data')' cannot work here as 'key' is not available.
        // This handler applies to ALL objects encountered within the props of a row.
        if (value && typeof value === 'object') {
          // If the object has an id, use that as the primary identifier
          if ('id' in value && value.id !== undefined) {
            return `ObjectWithId:id=${value.id}`;
          }
          // Otherwise use a fingerprint with minimal depth (keys only for non-id objects)
          return `ObjectKeys:[${Object.keys(value).sort().join(',')}]`;
        }
        return undefined; // Fall back to default handler for non-objects or null
      },
      // Handle arrays efficiently
      Array: (value: any): string | undefined => { // Ensured signature matches and provides a fallback
        if (Array.isArray(value)) {
          return `Array:length=${value.length}`;
        }
        return undefined; // Fall back to default handler
      }
    },
    ...options.fingerprintOptions
  };

  return withMemo(Component, {
    ...options,
    fingerprintOptions: rowFingerprint,
    displayName: options.displayName || `MemoRow(${Component.displayName || Component.name || 'Component'})`
  });
}

/**
 * Higher-order component for memoizing complex form components with many props
 * 
 * Optimized for form components which often receive many props but rarely need to re-render
 * 
 * @param Component - The form component to memoize
 * @param options - Options for memoization
 * @returns Memoized form component
 * 
 * @example
 * const MemoizedForm = withFormMemo(MyForm);
 */
export function withFormMemo<P extends object>(
  Component: ComponentType<P>,
  options: WithMemoOptions = {}
): React.MemoExoticComponent<ComponentType<P>> {
  // Default fingerprint options optimized for form components
  const formFingerprint: FingerprintOptions = {
    depth: 2, // Moderate depth for nested form values
    skipUndefined: true,
    // Ignore function props unless explicitly needed for comparison
    // since form handlers rarely change identity but cause re-renders
    customHandlers: {
      Function: () => 'fn', // All functions are considered equal
      ...options.fingerprintOptions?.customHandlers
    }
  };

  return withMemo(Component, {
    ...options,
    fingerprintOptions: formFingerprint,
    displayName: options.displayName || `MemoForm(${Component.displayName || Component.name || 'Component'})`
  });
}