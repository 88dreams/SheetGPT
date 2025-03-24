import requests
import json

def test_api_endpoints():
    """Test the API endpoints to see if our refactored backend is working."""
    
    print("Testing /api/v1/sports/entities/league endpoint...")
    response = requests.get("http://localhost:8000/api/v1/sports/entities/league?page=1&limit=5&sort_by=name")
    
    # Response code should include unauthorized if we're not authenticated,
    # which means the backend is running and responding
    print(f"Response status code: {response.status_code}")
    print(f"Response content: {response.text[:100]}...")
    
if __name__ == "__main__":
    test_api_endpoints()