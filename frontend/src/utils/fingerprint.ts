/**
 * Fingerprinting utility for generating stable hashes of objects and arrays
 * 
 * This utility provides functions to create consistent string representations of objects
 * and arrays, allowing for efficient comparison of complex data structures.
 * 
 * These functions help optimize React components by:
 * - Avoiding unnecessary re-renders when objects have changed reference but not content
 * - Providing stable dependency arrays for useEffect, useMemo, and useCallback
 * - Enabling custom equality checks for React.memo
 */

/**
 * Options for fingerprint generation
 */
export interface FingerprintOptions {
  /** Maximum depth to traverse objects and arrays */
  depth?: number;
  /** Skip undefined values in objects */
  skipUndefined?: boolean;
  /** Skip null values in objects */
  skipNull?: boolean;
  /** Format for date objects ('iso', 'timestamp', or 'none') */
  dateFormat?: 'iso' | 'timestamp' | 'none';
  /** Include object constructor names in fingerprint */
  includeConstructorNames?: boolean;
  /** Custom handler for specific types */
  customHandlers?: Record<string, (value: any) => string>;
}

/**
 * Default options for fingerprint generation
 */
const DEFAULT_OPTIONS: FingerprintOptions = {
  depth: 5,
  skipUndefined: true,
  skipNull: false,
  dateFormat: 'timestamp',
  includeConstructorNames: false,
  customHandlers: {},
};

/**
 * Generate a fingerprint for any value
 * 
 * @param value - The value to fingerprint
 * @param options - Options for fingerprint generation
 * @returns A string representation of the value
 */
export function fingerprint(value: any, options: FingerprintOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return generateFingerprint(value, opts, opts.depth || 5);
}

/**
 * Internal function for recursive fingerprint generation
 */
function generateFingerprint(value: any, options: FingerprintOptions, depth: number): string {
  // Handle primitive types directly
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  if (typeof value === 'string') {
    return `"${value}"`;
  }

  if (typeof value === 'symbol') {
    return value.toString();
  }

  // Stop at max depth
  if (depth <= 0) {
    return '{...}';
  }

  // Handle dates
  if (value instanceof Date) {
    if (options.dateFormat === 'iso') {
      return `Date:${value.toISOString()}`;
    } else if (options.dateFormat === 'timestamp') {
      return `Date:${value.getTime()}`;
    } else {
      return 'Date';
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map(item => generateFingerprint(item, options, depth - 1));
    return `[${items.join(',')}]`;
  }

  // Handle other objects
  if (typeof value === 'object') {
    // Check for custom handlers
    const typeName = value.constructor ? value.constructor.name : 'Object';
    
    if (options.customHandlers && options.customHandlers[typeName]) {
      return options.customHandlers[typeName](value);
    }

    // Regular object processing
    const keys = Object.keys(value).sort();
    if (keys.length === 0) {
      return options.includeConstructorNames ? `${typeName}{}` : '{}';
    }

    const pairs = keys
      .filter(key => {
        const val = value[key];
        if (options.skipUndefined && val === undefined) return false;
        if (options.skipNull && val === null) return false;
        return true;
      })
      .map(key => {
        const val = value[key];
        return `${key}:${generateFingerprint(val, options, depth - 1)}`;
      });

    if (options.includeConstructorNames) {
      return `${typeName}{${pairs.join(',')}}`;
    }
    
    return `{${pairs.join(',')}}`;
  }

  // Handle functions (just note their existence, not content)
  if (typeof value === 'function') {
    return 'Function';
  }

  // Fallback for unknown types
  return String(value);
}

/**
 * Compare two values for equality using fingerprinting
 * 
 * @param a - First value
 * @param b - Second value
 * @param options - Options for fingerprint generation
 * @returns True if the fingerprints match
 */
export function areEqual(a: any, b: any, options: FingerprintOptions = {}): boolean {
  return fingerprint(a, options) === fingerprint(b, options);
}

/**
 * Specialized comparator for dates
 */
export function areDatesEqual(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

/**
 * Specialized comparator for arrays that only checks length and references
 * Much faster than deep comparison for large arrays when you know the array 
 * references only change when content changes
 */
export function areArrayReferencesEqual(a: any[] | null | undefined, b: any[] | null | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a === b; // Only true if they're the same reference
}

/**
 * Creates a stable object fingerprint that's suitable for use in React dependency arrays
 * 
 * @param obj - The object to fingerprint
 * @param options - Options for fingerprint generation
 * @returns A memoization-friendly fingerprint string
 * 
 * @example
 * const dataFingerprint = useMemoizedFingerprint(complexData);
 * 
 * useEffect(() => {
 *   // Effect only runs when data actually changes, not just its reference
 * }, [dataFingerprint]);
 */
export function useMemoizedFingerprint(obj: any, options: FingerprintOptions = {}): string {
  // This wrapper is useful when this gets combined with React's useMemo
  return fingerprint(obj, options);
}

/**
 * Custom equality function for React.memo that uses fingerprinting
 * 
 * @param options - Options for fingerprint generation
 * @returns A function that compares prev and next props
 * 
 * @example
 * const ExpensiveComponent = React.memo(
 *   (props) => {
 *     // Component implementation
 *   },
 *   createMemoEqualityFn({ depth: 2 })
 * );
 */
export function createMemoEqualityFn(options: FingerprintOptions = {}) {
  return function memoEquality(prevProps: any, nextProps: any): boolean {
    return areEqual(prevProps, nextProps, options);
  };
}