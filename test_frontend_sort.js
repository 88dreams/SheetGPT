// Simple test script to test sorting from the frontend
const testSorting = async () => {
  // Function to test an endpoint with different sort options
  const testEndpoint = async (entityType, sortBy, sortDirection) => {
    console.log(`\nTesting ${entityType} sorted by ${sortBy} (${sortDirection})`);
    try {
      const response = await fetch(
        `/api/v1/sports/entities/${entityType}?page=1&limit=10&sort_by=${sortBy}&sort_direction=${sortDirection}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Got ${data.items.length} items, showing names and sort field:`);
      
      // Print each item's name and the sort field
      data.items.forEach(item => {
        if (sortBy in item) {
          console.log(`  ${item.name || 'N/A'} - ${sortBy}: ${item[sortBy] || 'N/A'}`);
        } else {
          console.log(`  ${item.name || 'N/A'} - ${sortBy} not found in response`);
        }
      });
      
      // Print pagination info
      console.log(`Page ${data.page} of ${data.pages} (Total items: ${data.total})`);
      return data;
    } catch (error) {
      console.error('Error:', error);
      return {};
    }
  };

  // Test sorting for different entity types with relationship fields
  console.log("Testing relationship field sorting");
  console.log("==================================================");
  
  // 1. Sort teams by league_name
  await testEndpoint("team", "league_name", "asc");
  await testEndpoint("team", "league_name", "desc");
  
  // 2. Sort division_conference by league_name
  await testEndpoint("division_conference", "league_name", "asc");
  await testEndpoint("division_conference", "league_name", "desc");
  
  // 3. Sort production services by production_company_name
  await testEndpoint("production", "production_company_name", "asc");
  await testEndpoint("production", "production_company_name", "desc");
  
  // 4. Sort broadcast rights by broadcast_company_name
  await testEndpoint("broadcast", "broadcast_company_name", "asc");
  await testEndpoint("broadcast", "broadcast_company_name", "desc");
  
  // 5. Test a polymorphic relationship sort
  await testEndpoint("production", "entity_name", "asc");
  await testEndpoint("broadcast", "entity_name", "asc");
};

// Run the test
testSorting();