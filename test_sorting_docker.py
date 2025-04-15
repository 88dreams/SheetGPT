import requests
import json
from typing import Dict, Any

def get_auth_token() -> str:
    """Get an authentication token."""
    url = "http://backend:8000/api/v1/auth/token"
    data = {
        "username": "admin@example.com",
        "password": "password"
    }
    
    print("Getting authentication token...")
    response = requests.post(url, data=data)
    
    if response.status_code == 200:
        token_data = response.json()
        print("Successfully obtained token.")
        return token_data["access_token"]
    else:
        print(f"Error getting token: {response.status_code}")
        print(response.text)
        return ""

def test_endpoint(entity_type: str, sort_by: str, sort_direction: str = "asc", limit: int = 5, token: str = "") -> Dict[str, Any]:
    """Test an endpoint with sorting parameters."""
    # Using backend service URL inside Docker network
    url = f"http://backend:8000/api/v1/sports/entities/{entity_type}"
    params = {
        "page": 1,
        "limit": limit,
        "sort_by": sort_by,
        "sort_direction": sort_direction
    }
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    print(f"\nTesting {entity_type} sorted by {sort_by} ({sort_direction}):")
    response = requests.get(url, params=params, headers=headers)
    
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
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Failed to get authentication token. Exiting.")
        return
    
    # 1. Sort teams by league_name
    test_endpoint("team", "league_name", "asc", token=token)
    test_endpoint("team", "league_name", "desc", token=token)
    
    # 2. Sort division_conference by league_name
    test_endpoint("division_conference", "league_name", "asc", token=token)
    test_endpoint("division_conference", "league_name", "desc", token=token)
    
    # 3. Sort production services by production_company_name
    test_endpoint("production", "production_company_name", "asc", token=token)
    test_endpoint("production", "production_company_name", "desc", token=token)
    
    # 4. Sort broadcast rights by broadcast_company_name
    test_endpoint("broadcast", "broadcast_company_name", "asc", token=token)
    test_endpoint("broadcast", "broadcast_company_name", "desc", token=token)
    
    # 5. Test a polymorphic relationship sort
    test_endpoint("production", "entity_name", "asc", token=token)
    test_endpoint("broadcast", "entity_name", "asc", token=token)

if __name__ == "__main__":
    main()