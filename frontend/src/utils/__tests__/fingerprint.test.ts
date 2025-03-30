import { 
  fingerprint, 
  areEqual, 
  areDatesEqual, 
  areArrayReferencesEqual, 
  createMemoEqualityFn 
} from '../fingerprint';

describe('fingerprint utility', () => {
  describe('fingerprint function', () => {
    it('handles primitive values', () => {
      expect(fingerprint(42)).toBe('42');
      expect(fingerprint('hello')).toBe('"hello"');
      expect(fingerprint(true)).toBe('true');
      expect(fingerprint(null)).toBe('null');
      expect(fingerprint(undefined)).toBe('undefined');
    });

    it('handles arrays', () => {
      expect(fingerprint([1, 2, 3])).toBe('[1,2,3]');
      expect(fingerprint(['a', 'b', 'c'])).toBe('["a","b","c"]');
      expect(fingerprint([])).toBe('[]');
    });

    it('handles nested arrays', () => {
      expect(fingerprint([1, [2, 3], 4])).toBe('[1,[2,3],4]');
      expect(fingerprint([1, [2, [3, 4]], 5])).toBe('[1,[2,[3,4]],5]');
    });

    it('handles objects', () => {
      expect(fingerprint({ a: 1, b: 2 })).toBe('{a:1,b:2}');
      expect(fingerprint({ b: 1, a: 2 })).toBe('{a:2,b:1}'); // keys are sorted
      expect(fingerprint({})).toBe('{}');
    });

    it('handles nested objects', () => {
      expect(fingerprint({ a: 1, b: { c: 2 } })).toBe('{a:1,b:{c:2}}');
      expect(fingerprint({ a: { b: { c: 1 } } })).toBe('{a:{b:{c:1}}}');
    });

    it('handles dates', () => {
      const date = new Date('2025-01-01T00:00:00.000Z');
      expect(fingerprint(date)).toBe(`Date:${date.getTime()}`);
      
      // Test with different date format options
      expect(fingerprint(date, { dateFormat: 'iso' })).toBe('Date:2025-01-01T00:00:00.000Z');
      expect(fingerprint(date, { dateFormat: 'none' })).toBe('Date');
    });

    it('respects the depth option', () => {
      const deepObject = { a: { b: { c: { d: { e: 5 } } } } };
      
      // Default depth of 5 should show the full structure
      expect(fingerprint(deepObject)).toBe('{a:{b:{c:{d:{e:5}}}}}');
      
      // Depth of 3 should truncate after c
      expect(fingerprint(deepObject, { depth: 3 })).toBe('{a:{b:{c:{...}}}}');
      
      // Depth of 1 should truncate after a
      expect(fingerprint(deepObject, { depth: 1 })).toBe('{a:{...}}');
    });

    it('handles null and undefined values according to options', () => {
      const obj = { a: null, b: undefined, c: 1 };
      
      // Default behavior: skip undefined but include null
      expect(fingerprint(obj)).toBe('{a:null,c:1}');
      
      // Skip both null and undefined
      expect(fingerprint(obj, { skipNull: true, skipUndefined: true })).toBe('{c:1}');
      
      // Include both null and undefined
      expect(fingerprint(obj, { skipNull: false, skipUndefined: false })).toBe('{a:null,b:undefined,c:1}');
    });

    it('can include constructor names', () => {
      class TestClass {
        value = 42;
      }
      
      const instance = new TestClass();
      
      // Default behavior: don't include constructor names
      expect(fingerprint(instance)).toBe('{value:42}');
      
      // Include constructor names
      expect(fingerprint(instance, { includeConstructorNames: true })).toBe('TestClass{value:42}');
    });

    it('supports custom handlers', () => {
      const customHandlers = {
        Set: (value: Set<any>) => `Set:${fingerprint(Array.from(value))}`,
      };
      
      const set = new Set([1, 2, 3]);
      
      // Without custom handler
      expect(fingerprint(set)).toBe('{}'); // Set internal values aren't enumerable
      
      // With custom handler
      expect(fingerprint(set, { customHandlers })).toBe('Set:[1,2,3]');
    });
  });

  describe('areEqual function', () => {
    it('correctly identifies equal primitive values', () => {
      expect(areEqual(42, 42)).toBe(true);
      expect(areEqual('hello', 'hello')).toBe(true);
      expect(areEqual(true, true)).toBe(true);
      expect(areEqual(null, null)).toBe(true);
      expect(areEqual(undefined, undefined)).toBe(true);
    });

    it('correctly identifies different primitive values', () => {
      expect(areEqual(42, 43)).toBe(false);
      expect(areEqual('hello', 'world')).toBe(false);
      expect(areEqual(true, false)).toBe(false);
      expect(areEqual(null, undefined)).toBe(false);
    });

    it('correctly identifies equal arrays', () => {
      expect(areEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(areEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('correctly identifies different arrays', () => {
      expect(areEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(areEqual([1, 2, 3], [1, 2])).toBe(false);
      expect(areEqual([1, 2], [2, 1])).toBe(false); // Order matters
    });

    it('correctly identifies equal objects', () => {
      expect(areEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(areEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true); // Order doesn't matter
    });

    it('correctly identifies different objects', () => {
      expect(areEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(areEqual({ a: 1, b: 2 }, { a: 1 })).toBe(false);
      expect(areEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('correctly identifies equal complex objects', () => {
      const obj1 = { a: 1, b: { c: [1, 2, { d: 3 }] } };
      const obj2 = { a: 1, b: { c: [1, 2, { d: 3 }] } };
      expect(areEqual(obj1, obj2)).toBe(true);
    });

    it('correctly identifies different complex objects', () => {
      const obj1 = { a: 1, b: { c: [1, 2, { d: 3 }] } };
      const obj2 = { a: 1, b: { c: [1, 2, { d: 4 }] } };
      expect(areEqual(obj1, obj2)).toBe(false);
    });

    it('correctly identifies equal dates', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-01-01T00:00:00.000Z');
      expect(areEqual(date1, date2)).toBe(true);
    });

    it('correctly identifies different dates', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-01-02T00:00:00.000Z');
      expect(areEqual(date1, date2)).toBe(false);
    });
  });

  describe('areDatesEqual function', () => {
    it('returns true for identical date references', () => {
      const date = new Date();
      expect(areDatesEqual(date, date)).toBe(true);
    });

    it('returns true for different date objects with the same time', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-01-01T00:00:00.000Z');
      expect(areDatesEqual(date1, date2)).toBe(true);
    });

    it('returns false for dates with different times', () => {
      const date1 = new Date('2025-01-01T00:00:00.000Z');
      const date2 = new Date('2025-01-02T00:00:00.000Z');
      expect(areDatesEqual(date1, date2)).toBe(false);
    });

    it('handles null and undefined values', () => {
      const date = new Date();
      expect(areDatesEqual(date, null)).toBe(false);
      expect(areDatesEqual(null, date)).toBe(false);
      expect(areDatesEqual(date, undefined)).toBe(false);
      expect(areDatesEqual(undefined, date)).toBe(false);
      expect(areDatesEqual(null, null)).toBe(true);
      expect(areDatesEqual(undefined, undefined)).toBe(true);
      expect(areDatesEqual(null, undefined)).toBe(false);
    });
  });

  describe('areArrayReferencesEqual function', () => {
    it('returns true for identical array references', () => {
      const arr = [1, 2, 3];
      expect(areArrayReferencesEqual(arr, arr)).toBe(true);
    });

    it('returns false for different array references with same content', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2, 3];
      expect(areArrayReferencesEqual(arr1, arr2)).toBe(false);
    });

    it('returns false for arrays with different lengths', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [1, 2];
      expect(areArrayReferencesEqual(arr1, arr2)).toBe(false);
    });

    it('handles null and undefined values', () => {
      const arr = [1, 2, 3];
      expect(areArrayReferencesEqual(arr, null)).toBe(false);
      expect(areArrayReferencesEqual(null, arr)).toBe(false);
      expect(areArrayReferencesEqual(arr, undefined)).toBe(false);
      expect(areArrayReferencesEqual(undefined, arr)).toBe(false);
      expect(areArrayReferencesEqual(null, null)).toBe(true);
      expect(areArrayReferencesEqual(undefined, undefined)).toBe(true);
      expect(areArrayReferencesEqual(null, undefined)).toBe(false);
    });
  });

  describe('createMemoEqualityFn function', () => {
    it('creates a function that correctly compares props', () => {
      const equalityFn = createMemoEqualityFn();
      
      const props1 = { a: 1, b: 'test', c: { d: 2 } };
      const props2 = { a: 1, b: 'test', c: { d: 2 } };
      const props3 = { a: 1, b: 'test', c: { d: 3 } };
      
      expect(equalityFn(props1, props2)).toBe(true);
      expect(equalityFn(props1, props3)).toBe(false);
    });

    it('respects custom options', () => {
      const equalityFn = createMemoEqualityFn({ depth: 1 });
      
      const props1 = { a: 1, b: { c: 2 } };
      const props2 = { a: 1, b: { c: 3 } }; // Different nested property
      
      // With depth 1, the nested difference isn't detected
      expect(equalityFn(props1, props2)).toBe(true);
      
      // If we use the default depth, the difference is detected
      const defaultEqualityFn = createMemoEqualityFn();
      expect(defaultEqualityFn(props1, props2)).toBe(false);
    });
  });
});