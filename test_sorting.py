import requests
import json
from typing import Dict, Any

def test_endpoint(entity_type: str, sort_by: str, sort_direction: str = "asc", limit: int = 5) -> Dict[str, Any]:
    """Test an endpoint with sorting parameters."""
    url = f"http://localhost:8000/api/v1/sports/entities/{entity_type}"
    params = {
        "page": 1,
        "limit": limit,
        "sort_by": sort_by,
        "sort_direction": sort_direction
    }
    
    print(f"\nTesting {entity_type} sorted by {sort_by} ({sort_direction}):")
    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Got {len(data['items'])} items, showing names and sort field:")
        
        # Print each item's name and the sort field
        for item in data['items']:
            if sort_by in item:
                print(f"  {item.get('name', 'N/A')} - {sort_by}: {item.get(sort_by, 'N/A')}")
            else:
                print(f"  {item.get('name', 'N/A')} - {sort_by} not found in response")
        
        # Print pagination info
        print(f"Page {data['page']} of {data['pages']} (Total items: {data['total']})")
        return data
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return {}

def main():
    """Test sorting for different entity types with relationship fields."""
    print("Testing relationship field sorting")
    print("=" * 50)
    
    # 1. Sort teams by league_name
    test_endpoint("team", "league_name", "asc")
    test_endpoint("team", "league_name", "desc")
    
    # 2. Sort division_conference by league_name
    test_endpoint("division_conference", "league_name", "asc")
    test_endpoint("division_conference", "league_name", "desc")
    
    # 3. Sort production services by production_company_name
    test_endpoint("production", "production_company_name", "asc")
    test_endpoint("production", "production_company_name", "desc")
    
    # 4. Sort broadcast rights by broadcast_company_name
    test_endpoint("broadcast", "broadcast_company_name", "asc")
    test_endpoint("broadcast", "broadcast_company_name", "desc")
    
    # 5. Test a polymorphic relationship sort
    test_endpoint("production", "entity_name", "asc")
    test_endpoint("broadcast", "entity_name", "asc")

if __name__ == "__main__":
    main()