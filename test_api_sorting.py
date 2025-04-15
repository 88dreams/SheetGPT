import requests
import json
import sys
import os

# Use appropriate host based on environment
API_HOST = "backend" if os.environ.get("RUNNING_IN_DOCKER") else "localhost"

def get_auth_token():
    """Get an authentication token for API access."""
    auth_url = f"http://{API_HOST}:8000/api/v1/auth/login"
    auth_data = {
        "username": "lucas.wilson@gmail.com", 
        "password": "sheetgpt"
    }
    
    try:
        print("Getting authentication token...")
        response = requests.post(auth_url, data=auth_data)
        response.raise_for_status()
        token_data = response.json()
        token = token_data.get("access_token")
        if token:
            print("Successfully obtained authentication token")
            return token
        else:
            print("Failed to get token from response")
            return None
    except requests.exceptions.RequestException as e:
        print(f"Authentication error: {e}")
        return None

def test_sorting(entity_type, sort_field, sort_direction="asc", auth_token=None):
    """Test sorting an entity type by a specific field."""
    print(f"\n=== Testing {entity_type} sorted by {sort_field} ({sort_direction}) ===")
    
    url = f"http://{API_HOST}:8000/api/v1/sports/entities/{entity_type}"
    params = {
        "page": 1,
        "limit": 10,
        "sort_by": sort_field,
        "sort_direction": sort_direction
    }
    
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        if not data.get("items"):
            print(f"No items found for {entity_type}")
            return
            
        print(f"Got {len(data['items'])} items, total: {data.get('total', 'unknown')}")
        
        # Print each item's name and the sort field value
        for i, item in enumerate(data["items"], 1):
            item_name = item.get("name", "Unknown")
            sort_value = item.get(sort_field, "N/A")
            print(f"{i}. {item_name} - {sort_field}: {sort_value}")
            
        # Print page info
        print(f"Page {data.get('page', 1)} of {data.get('pages', 1)}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        
def run_tests():
    """Run a set of sorting tests."""
    # Get authentication token
    auth_token = get_auth_token()
    if not auth_token:
        print("Failed to authenticate. Aborting tests.")
        return
    
    # Test team sorting by league_name
    test_sorting("team", "league_name", "asc", auth_token)
    test_sorting("team", "league_name", "desc", auth_token)
    
    # Test division_conference sorting by league_name
    test_sorting("division_conference", "league_name", "asc", auth_token)
    test_sorting("division_conference", "league_name", "desc", auth_token)
    
    # Test production sorting by production_company_name
    test_sorting("production", "production_company_name", "asc", auth_token)
    test_sorting("production", "production_company_name", "desc", auth_token)
    
    # Test broadcast sorting by broadcast_company_name
    test_sorting("broadcast", "broadcast_company_name", "asc", auth_token)
    test_sorting("broadcast", "broadcast_company_name", "desc", auth_token)
    
    # Test polymorphic relationship sorting
    test_sorting("production", "entity_name", "asc", auth_token)
    test_sorting("broadcast", "entity_name", "asc", auth_token)

if __name__ == "__main__":
    run_tests()