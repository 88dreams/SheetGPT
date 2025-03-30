import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fingerprint, areEqual, createMemoEqualityFn } from '../fingerprint';

interface ComplexObject {
  id: string;
  name: string;
  details: {
    created: Date;
    tags: string[];
    metadata: Record<string, any>;
  };
}

interface ItemProps {
  item: ComplexObject;
  onSelect: (id: string) => void;
}

/**
 * Expensive component that should only re-render when its props actually change
 */
const ExpensiveItem = React.memo(
  ({ item, onSelect }: ItemProps) => {
    console.log(`Rendering ExpensiveItem ${item.id}`);
    
    // Simulate expensive rendering operation
    const startTime = performance.now();
    while (performance.now() - startTime < 5) {
      // Intentionally blocking the thread to simulate heavy computation
    }
    
    return (
      <div className="p-4 border rounded shadow my-2">
        <h3 className="text-lg font-bold">{item.name}</h3>
        <p>Created: {item.details.created.toLocaleDateString()}</p>
        <div className="flex flex-wrap gap-1 my-2">
          {item.details.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>
        <button
          onClick={() => onSelect(item.id)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Select
        </button>
      </div>
    );
  },
  // Custom equality function using fingerprinting
  createMemoEqualityFn({ depth: 3 })
);

/**
 * Example component showing how to use fingerprinting
 */
const FingerprintExample: React.FC = () => {
  const [items, setItems] = useState<ComplexObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  // Create some initial data
  useEffect(() => {
    const newItems: ComplexObject[] = [];
    for (let i = 0; i < 5; i++) {
      newItems.push({
        id: `item-${i}`,
        name: `Item ${i}`,
        details: {
          created: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          tags: [`tag-${i}`, 'common', i % 2 === 0 ? 'even' : 'odd'],
          metadata: {
            importance: Math.floor(Math.random() * 10),
            category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
          },
        },
      });
    }
    setItems(newItems);
  }, []);
  
  // Memoize the handler to prevent unnecessary re-rendering of child components
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    console.log(`Selected item: ${id}`);
  }, []);
  
  // Generate fingerprints for the current items state
  const itemsFingerprint = useMemo(() => {
    return fingerprint(items);
  }, [items]);
  
  // Simulate an update that creates a new array but with the same content
  const handleSimulateUpdate = () => {
    // Create a new array reference with the same items
    const newItems = [...items];
    setItems(newItems);
    setUpdateCount(prev => prev + 1);
  };
  
  // Modify a random item to demonstrate actual content change
  const handleModifyRandom = () => {
    if (items.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * items.length);
    const newItems = [...items];
    
    // Create a new object with a modified name
    newItems[randomIndex] = {
      ...newItems[randomIndex],
      name: `${newItems[randomIndex].name} (Modified)`,
      details: {
        ...newItems[randomIndex].details,
        tags: [...newItems[randomIndex].details.tags, 'modified'],
      },
    };
    
    setItems(newItems);
    setUpdateCount(prev => prev + 1);
  };
  
  // Demonstrate comparing two objects
  const compareExample = useMemo(() => {
    if (items.length < 2) return null;
    
    const equal = areEqual(items[0], items[1]);
    return (
      <div className="mt-4 p-3 bg-gray-100 rounded">
        <h3 className="font-bold">Object Comparison:</h3>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(items[0], null, 2)}
        </pre>
        <p className="my-2">compared to</p>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(items[1], null, 2)}
        </pre>
        <p className="mt-2 font-semibold">
          Result: {equal ? 'Equal' : 'Not Equal'}
        </p>
      </div>
    );
  }, [items]);
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Fingerprinting Example</h1>
      
      <div className="mb-6 p-4 bg-gray-50 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">State Information</h2>
        <p>Update Count: {updateCount}</p>
        <p>Items Count: {items.length}</p>
        <p>Selected ID: {selectedId || 'None'}</p>
        <div className="mt-2">
          <details>
            <summary className="cursor-pointer text-blue-600">Items Fingerprint</summary>
            <pre className="mt-2 p-2 bg-gray-100 overflow-auto text-xs">
              {itemsFingerprint}
            </pre>
          </details>
        </div>
      </div>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSimulateUpdate}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Simulate Reference Change
        </button>
        <button
          onClick={handleModifyRandom}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Modify Random Item
        </button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Items</h2>
        {items.map(item => (
          <ExpensiveItem
            key={item.id}
            item={item}
            onSelect={handleSelect}
          />
        ))}
      </div>
      
      {compareExample}
    </div>
  );
};

export default FingerprintExample;