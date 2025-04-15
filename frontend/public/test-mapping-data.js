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
