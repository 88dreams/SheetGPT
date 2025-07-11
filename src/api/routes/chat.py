from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    ChatResponse,
    ConversationList,
    ConversationListItem,
    ConversationOrderUpdate
)
from src.services.chat import ChatService
from src.utils.database import get_db
from src.utils.security import get_current_user_id

router = APIRouter()

# Instantiate the service once
chat_service = ChatService()

def get_chat_service() -> ChatService:
    """Returns the singleton chat service instance."""
    return chat_service

@router.post("/conversations", response_model=ConversationListItem)
async def create_conversation(
    conversation: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
) -> ConversationListItem:
    """Create a new conversation."""
    new_conversation = await chat_service.create_conversation(
        db=db,
        user_id=current_user_id,
        title=conversation.title,
        description=conversation.description,
        tags=conversation.tags
    )
    return ConversationListItem.model_validate(new_conversation)

@router.get("/conversations", response_model=ConversationList)
async def list_conversations(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
) -> ConversationList:
    """List user's conversations with pagination."""
    conversations = await chat_service.get_user_conversations(
        db=db,
        user_id=current_user_id,
        skip=skip,
        limit=limit
    )
    return ConversationList(
        items=[ConversationListItem.model_validate(conv) for conv in conversations],
        total=len(conversations),  # TODO: Implement proper count
        skip=skip,
        limit=limit
    )

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
) -> ConversationResponse:
    """Get a specific conversation."""
    try:
        conversation = await chat_service.get_conversation(db, conversation_id)
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )
        # Manually load messages for the response model
        await db.refresh(conversation, attribute_names=['messages'])
        return ConversationResponse.model_validate(conversation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.post("/conversations/{conversation_id}/messages")
async def create_message(
    conversation_id: UUID,
    message: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    print(f"--- Entered create_message for conversation {conversation_id}, user {current_user_id} ---")
    try:
        # Get conversation and verify ownership
        conversation = await chat_service.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )

        # Create async generator for streaming response
        async def event_generator():
            print(f"--- event_generator started for conversation {conversation_id} ---")
            import asyncio
            search_detected = False
            
            try:
                # Buffer for collecting chunks during search operations
                buffer = []
                is_complete = False
                
                # Log the request message details
                print(f"Processing message from user: {message.content[:100]}... with LLM: {message.selected_llm}")
                print(f"Structured format requested: {message.structured_format is not None}")
                
                # Process the streaming response
                async for chunk in chat_service.get_chat_response(
                    db=db,
                    conversation_id=conversation_id,
                    user_message=message.content,
                    structured_format=message.structured_format,
                    selected_llm=message.selected_llm
                ):
                    # Detect search activity
                    if "[SEARCH]" in chunk:
                        search_detected = True
                        print(f"Search detected in stream: {chunk}")
                    
                    # Check for stream end marker
                    if "[STREAM_END]" in chunk:
                        # Mark stream as complete
                        is_complete = True
                        # Clean the marker from the chunk
                        chunk = chunk.replace("[STREAM_END]", "")
                    
                    # Only send non-empty chunks
                    if chunk.strip():
                        # Ensure chunk is properly escaped for JSON
                        escaped_chunk = chunk.replace('"', '\\"').replace('\n', '\\n')
                        yield f'data: {{"text": "{escaped_chunk}"}}\n\n'
                        
                        # Ensure processing time for the client
                        if search_detected:
                            await asyncio.sleep(0.1)
                    
                    # If we've found the end marker, send the completion signal and exit
                    if is_complete:
                        # Add delay to ensure prior chunks are processed
                        await asyncio.sleep(1.0)
                        print(f"Sending stream completion marker")
                        yield f'data: {{"text": "__STREAM_COMPLETE__"}}\n\n'
                        # Another delay to ensure completion marker is processed
                        await asyncio.sleep(1.0)
                        break
                        
                # If we somehow exit the loop without sending completion marker, send it now
                if not is_complete:
                    print(f"Loop ended without completion marker, sending completion")
                    await asyncio.sleep(1.0)
                    yield f'data: {{"text": "__STREAM_COMPLETE__"}}\n\n'
                    
            except Exception as e:
                print(f"Error in event generator: {str(e)}")
                yield f'data: {{"error": "{str(e)}"}}\n\n'
                # Also send completion marker in case of error
                yield f'data: {{"text": "__STREAM_COMPLETE__"}}\n\n'

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream"
        )
    except ValueError as e:
        print(f"ValueError in create_message (likely conversation not found or auth issue): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException as he:
        print(f"HTTPException during pre-stream setup: {str(he.detail)}")
        raise he
    except Exception as e:
        print(f"Unexpected error in create_message before streaming: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error before initiating chat stream: {str(e)}"
        )

@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
) -> ConversationResponse:
    """Update conversation details."""
    try:
        # Verify conversation ownership by eagerly loading the conversation
        conversation = await chat_service.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this conversation"
            )

        # Update conversation
        updated_conversation = await chat_service.update_conversation(
            db=db,
            conversation_id=conversation_id,
            update_data=update_data
        )
        return ConversationResponse.model_validate(updated_conversation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Delete a conversation and all its associated data."""
    try:
        # Verify conversation ownership
        conversation = await chat_service.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this conversation"
            )

        # Delete the conversation
        await chat_service.delete_conversation(db, conversation_id)
        
        # Return an empty response with 204 status
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )

@router.delete("/conversations/{conversation_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    conversation_id: UUID,
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Delete a specific message from a conversation."""
    try:
        # Verify conversation ownership
        conversation = await chat_service.get_conversation(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete messages from this conversation"
            )

        # Delete the message
        await chat_service.delete_message(db, message_id)
        
        # Return an empty response with 204 status
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete message: {str(e)}"
        )

@router.post("/conversations/order", response_model=List[ConversationListItem])
async def update_conversation_orders(
    conversation_orders: List[ConversationOrderUpdate],
    db: AsyncSession = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
) -> List[ConversationListItem]:
    """Update the order of multiple conversations."""
    try:
        # Convert to the format expected by the service
        order_data = [{"id": item.id, "order": item.order} for item in conversation_orders]
        
        updated_conversations = await chat_service.update_multiple_conversation_orders(
            db=db,
            user_id=current_user_id,
            conversation_orders=order_data
        )
        
        return [ConversationListItem.model_validate(conv) for conv in updated_conversations]
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update conversation orders: {str(e)}"
        ) 