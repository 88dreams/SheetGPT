from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, List, Any, Optional, Union
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import ValidationError, BaseModel
import json

from src.utils.database import get_db
from src.utils.auth import get_current_user
from src.services.sports.facade_v2 import SportsFacadeV2
from src.services.sports.entity_resolver import EntityResolutionError

router = APIRouter(
    prefix="/v2/sports",
    tags=["sports_v2"],
    responses={404: {"description": "Not found"}},
)

# Initialize the facade service
sports_facade = SportsFacadeV2()

class EntityResolutionRequest(BaseModel):
    entity_type: str
    name_or_id: str
    context: Optional[Dict[str, Any]] = None

class EntityResolutionResponse(BaseModel):
    entity: Dict[str, Any]
    resolution_info: Dict[str, Any]

@router.post("/resolve-entity", response_model=EntityResolutionResponse)
async def resolve_entity(
    request: EntityResolutionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Resolve an entity by name or ID with smart fallback.
    
    This endpoint demonstrates the improved entity resolution capabilities
    including:
    - Fuzzy name matching
    - Cross-entity type fallbacks
    - Context-aware resolution
    - Special handling for virtual entities
    
    Returns both the resolved entity and metadata about how it was resolved.
    """
    try:
        entity = await sports_facade.resolve_entity(
            db, 
            request.entity_type, 
            request.name_or_id, 
            request.context
        )
        
        # Extract resolution info from entity metadata
        resolution_info = {
            "original_request": {
                "entity_type": request.entity_type,
                "name_or_id": request.name_or_id
            },
            "resolved_entity_type": request.entity_type
        }
        
        # Add resolution metadata if available
        if '_resolved_via' in entity:
            resolution_info["resolved_via"] = entity.pop('_resolved_via')
            
        if '_match_score' in entity:
            resolution_info["match_score"] = entity.pop('_match_score')
            
        if '_fuzzy_matched' in entity:
            resolution_info["fuzzy_matched"] = entity.pop('_fuzzy_matched')
            
        if '_context_matched' in entity:
            resolution_info["context_matched"] = entity.pop('_context_matched')
            resolution_info["context_type"] = entity.pop('_context_type', 'unknown')
            
        if '_virtual' in entity:
            resolution_info["virtual_entity"] = entity.get('_virtual')
            
        return {
            "entity": entity,
            "resolution_info": resolution_info
        }
    except EntityResolutionError as e:
        raise HTTPException(
            status_code=404, 
            detail=e.to_dict()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error resolving entity: {str(e)}"
        )

@router.get("/entities/{entity_type}")
async def get_entities_v2(
    entity_type: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    include_related_names: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get entities of a specific type with enhanced related information.
    
    This endpoint serves as an improved version of the original /entities endpoint
    with better handling of related entity names and enhanced filtering capabilities.
    
    - Use include_related_names=true to include related entity names
    - Supports pagination with page and limit parameters
    """
    try:
        if include_related_names:
            return await sports_facade.get_entities_with_related_names(
                db, entity_type, page, limit
            )
        else:
            return await sports_facade.get_entities(
                db, entity_type, page, limit
            )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error retrieving entities: {str(e)}"
        )

@router.post("/resolve-references")
async def resolve_references(
    references: Dict[str, Dict[str, str]],
    db: AsyncSession = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Batch resolve multiple entity references to their IDs.
    
    Example request:
    {
        "league": {"name": "NFL"},
        "team": {"name": "Dallas Cowboys", "context": {"league_id": "NFL"}},
        "stadium": {"name": "AT&T Stadium"}
    }
    
    Returns a dictionary mapping the keys to resolved entity IDs.
    """
    result = {}
    errors = {}
    
    for key, ref_data in references.items():
        try:
            entity_type = ref_data.get("type", key)
            name = ref_data.get("name")
            context = ref_data.get("context")
            
            if not name:
                errors[key] = {"error": "Missing name field"}
                continue
            
            parsed_context = None
            if isinstance(context, str):
                try:
                    parsed_context = json.loads(context)
                except json.JSONDecodeError:
                    errors[key] = {"error": "Invalid context JSON"}
                    continue
            elif isinstance(context, dict):
                parsed_context = context

            entity_id = await sports_facade.resolve_entity_reference(
                db, entity_type, name, parsed_context
            )
            
            result[key] = str(entity_id)
        except EntityResolutionError as e:
            errors[key] = e.to_dict()
        except Exception as e:
            errors[key] = {"error": str(e)}
    
    return {
        "resolved": result,
        "errors": errors
    }