#!/bin/bash
# Script to run the mapping tests in the Docker container

# Create a test file using Node.js
cat > test-mapping-exec.js << 'EOF'
// Simple script to log test data

const mappings = {
  // Test 1: Broadcast
  broadcastMappings: {
    broadcast_company_id: 'Name of company',
    entity_id: 'Entity Name',
    entity_type: 'Entity Type',
    territory: 'Territory',
    start_date: 'Start date of Rights',
    end_date: 'End date of Rights'
  },
  
  // Test 2: Brand
  brandMappings: {
    name: 'Brand Name',
    industry: 'Industry',
    company_type: 'Company Type',
    partner: 'Partner',
    partner_relationship: 'Relationship Type'
  },
  
  // Test 3: Stadium
  stadiumMappings: {
    name: 'Name',
    city: 'City',
    state: 'State',
    country: 'Country',
    capacity: 'Capacity'
  }
};

const data = {
  // Test 1: Broadcast
  broadcastData: [
    'ESPN',                // Index 0: Company name
    'NFL',                 // Index 1: Entity name
    'League',              // Index 2: Entity type
    'USA',                 // Index 3: Territory
    '2023',                // Index 4: Start date (year only)
    '2028',                // Index 5: End date (year only)
    'Primary Broadcaster'  // Index 6: Role/service type
  ],
  
  // Test 2: Brand
  brandData: [
    'Nike',                  // Index 0: Brand name
    'NFL',                   // Index 1: Partner
    'Sports',                // Index 2: Industry
    'Official Partner',      // Index 3: Relationship
    '2022',                  // Index 4: Start date
    '2027',                  // Index 5: End date
    'Sponsor'                // Index 6: Company type
  ],
  
  // Test 3: Stadium
  stadiumData: [
    'SoFi Stadium',    // Index 0: Stadium name
    'Los Angeles',     // Index 1: City
    'CA',              // Index 2: State
    'USA',             // Index 3: Country
    '70000',           // Index 4: Capacity
    'NFL'              // Index 5: Extra data (not mapped)
  ]
};

console.log('Test Data:');
console.log(JSON.stringify({
  mappings,
  data
}, null, 2));
EOF

# Send this test data to the frontend container for manual verification and testing in the browser console
docker cp test-mapping-exec.js sheetgpt-frontend-1:/app/public/test-mapping-data.js

echo "Test data has been copied to the frontend container."
echo "To test transformMappedData:"
echo "1. Open the browser console at http://localhost:5173"
echo "2. Run this code in the console to import transformMappedData:"
echo "   import('/src/components/data/SportDataMapper/utils/importUtils.js').then(module => window.transformMappedData = module.transformMappedData);"
echo "3. Load the test data:"
echo "   import('/test-mapping-data.js').then(module => window.testData = module);"
echo "4. Run the test on broadcast data:"
echo "   transformMappedData(testData.mappings.broadcastMappings, testData.data.broadcastData)"
echo "5. Run the test on brand data:"
echo "   transformMappedData(testData.mappings.brandMappings, testData.data.brandData)"
echo "6. Run the test on stadium data:"
echo "   transformMappedData(testData.mappings.stadiumMappings, testData.data.stadiumData)"

# Remove the temporary file
rm test-mapping-exec.js