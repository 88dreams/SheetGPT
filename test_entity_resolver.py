"""
Test script for the new Entity Resolver functionality.

This script demonstrates the enhanced entity resolution capabilities including:
- Fuzzy name matching
- Cross-entity type fallbacks
- Context-aware resolution
- Virtual entity handling

Usage:
    python test_entity_resolver.py
"""

import asyncio
import json
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import declarative_base

from src.core.config import settings
from src.services.sports.entity_resolver import EntityResolver, EntityResolutionError
from src.services.sports.facade_v2 import SportsFacadeV2

# Database connection settings
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL
engine = create_async_engine(SQLALCHEMY_DATABASE_URL)
Base = declarative_base()
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Test cases to demonstrate the entity resolver's capabilities
TEST_CASES = [
    # Basic exact name resolution
    {"entity_type": "league", "name": "NFL", "context": None, "description": "Exact league name"},
    {"entity_type": "team", "name": "New York Yankees", "context": None, "description": "Exact team name"},
    
    # Fuzzy name matching
    {"entity_type": "league", "name": "Nationl Futbol Leage", "context": None, "description": "Fuzzy league name (misspelled)"},
    {"entity_type": "team", "name": "dallas cowbys", "context": None, "description": "Fuzzy team name (lowercase, misspelled)"},
    
    # Cross-entity type fallbacks
    {"entity_type": "broadcast_company", "name": "ESPN", "context": None, "description": "Brand as broadcast company"},
    {"entity_type": "production_company", "name": "NBC Sports", "context": None, "description": "Brand as production company"},
    
    # Context-aware resolution
    {"entity_type": "team", "name": "Cowboys", "context": {"league_id": "NFL"}, "description": "Team with league context"},
    {"entity_type": "division_conference", "name": "East", "context": {"league_id": "NFL"}, "description": "Division with league context"},
    
    # Special virtual entities
    {"entity_type": "championship", "name": "Super Bowl", "context": None, "description": "Championship (virtual entity)"},
    {"entity_type": "tournament", "name": "March Madness", "context": None, "description": "Tournament (virtual entity)"},
    
    # Type coercion
    {"entity_type": "division", "name": "AFC East", "context": None, "description": "Division type coercion to division_conference"},
    {"entity_type": "conference", "name": "Big Ten", "context": None, "description": "Conference type coercion to division_conference"},
]

class UUIDEncoder(json.JSONEncoder):
    """JSON encoder that handles UUID objects."""
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

async def test_entity_resolver():
    """Run tests on the EntityResolver class."""
    async with SessionLocal() as db_session:
        # Create entity resolver instance
        resolver = EntityResolver(fuzzy_threshold=0.7)
        
        # Create sports facade
        facade = SportsFacadeV2()
        
        # Test entity resolution for each test case
        print("Testing entity resolution:")
        print("=========================")
        print()
        
        results = []
        
        for i, test_case in enumerate(TEST_CASES, 1):
            print(f"Test {i}: {test_case['description']}")
            print(f"  Entity Type: {test_case['entity_type']}")
            print(f"  Name: {test_case['name']}")
            print(f"  Context: {test_case['context']}")
            
            try:
                # Resolve entity
                entity = await resolver.resolve_entity(
                    db_session, 
                    test_case['entity_type'], 
                    test_case['name'], 
                    test_case['context']
                )
                
                # Extract resolution info (metadata fields that start with _)
                resolution_info = {
                    k: v for k, v in entity.items() if k.startswith('_')
                }
                
                # Remove metadata fields for cleaner display
                entity_data = {
                    k: v for k, v in entity.items() if not k.startswith('_')
                }
                
                # Print result
                print(f"  Result: RESOLVED")
                print(f"  Entity ID: {entity_data.get('id')}")
                print(f"  Entity Name: {entity_data.get('name')}")
                
                if resolution_info:
                    print(f"  Resolution Info:")
                    for key, value in resolution_info.items():
                        print(f"    {key}: {value}")
                
                # Add to results
                results.append({
                    "test_case": test_case,
                    "success": True,
                    "entity": entity_data,
                    "resolution_info": resolution_info
                })
                
            except EntityResolutionError as e:
                # Print error
                print(f"  Result: FAILED")
                print(f"  Error: {e.message}")
                
                # Add to results
                results.append({
                    "test_case": test_case,
                    "success": False,
                    "error": e.to_dict()
                })
                
            except Exception as e:
                # Print unexpected error
                print(f"  Result: ERROR")
                print(f"  Error: {str(e)}")
                
                # Add to results
                results.append({
                    "test_case": test_case,
                    "success": False,
                    "error": str(e)
                })
                
            print()
        
        # Save results to file
        with open('entity_resolver_test_results.json', 'w') as f:
            json.dump(results, f, indent=2, cls=UUIDEncoder)
        
        print(f"Test results saved to entity_resolver_test_results.json")
        print()
        
        # Test batch reference resolution
        print("Testing batch reference resolution:")
        print("=================================")
        print()
        
        # Create references dictionary for batch resolution
        references = {
            f"ref_{i}": {
                "type": test_case['entity_type'],
                "name": test_case['name'],
                "context": test_case['context']
            }
            for i, test_case in enumerate(TEST_CASES, 1)
        }
        
        try:
            # Call the batch resolver method of the facade service
            result = await facade.entity_resolver.resolve_references(db_session, references)
            
            # Print result
            print("Batch resolution results:")
            print("  Successes:")
            for key, value in result.items():
                if 'id' in value:
                    print(f"    {key}: {value['name']} (ID: {value['id']})")
            
            print("  Errors:")
            for key, value in result.items():
                if 'error' in value:
                    print(f"    {key}: {value['message']}")
            
            # Save batch results to file
            with open('entity_resolver_batch_results.json', 'w') as f:
                json.dump(result, f, indent=2, cls=UUIDEncoder)
            
            print(f"Batch results saved to entity_resolver_batch_results.json")
            
        except Exception as e:
            print(f"Batch resolution error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_entity_resolver())