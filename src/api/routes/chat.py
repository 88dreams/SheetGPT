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

@router.post("/conversations", response_model=ConversationListItem)
async def create_conversation(
    conversation: ConversationCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ConversationListItem:
    """Create a new conversation."""
    chat_service = ChatService(db)
    conversation = await chat_service.create_conversation(
        user_id=current_user_id,
        title=conversation.title,
        description=conversation.description
    )
    return ConversationListItem.model_validate(conversation)

@router.get("/conversations", response_model=ConversationList)
async def list_conversations(
    skip: int = 0,
    limit: int = 10,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ConversationList:
    """List user's conversations with pagination."""
    chat_service = ChatService(db)
    conversations = await chat_service.get_user_conversations(
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
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ConversationResponse:
    """Get a specific conversation."""
    chat_service = ChatService(db)
    try:
        conversation = await chat_service.get_conversation(conversation_id)
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this conversation"
            )
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
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Send a message and get a streaming response from ChatGPT."""
    chat_service = ChatService(db)
    try:
        # Get conversation and verify ownership
        conversation = await chat_service.get_conversation(conversation_id)
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
            import asyncio
            search_detected = False
            
            try:
                # Buffer for collecting chunks during search operations
                buffer = []
                is_complete = False
                
                # Log the request message details
                print(f"Processing message from user: {message.content[:100]}...")
                print(f"Structured format requested: {message.structured_format is not None}")
                
                # Process the streaming response
                async for chunk in chat_service.get_chat_response(
                    conversation_id=conversation_id,
                    user_message=message.content,
                    structured_format=message.structured_format
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ConversationResponse:
    """Update conversation details."""
    chat_service = ChatService(db)
    try:
        # Verify conversation ownership
        conv_messages = await chat_service.get_conversation_messages(conversation_id)
        if not conv_messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        conversation = conv_messages[0].conversation
        if conversation.user_id != current_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this conversation"
            )

        # Update conversation
        if update_data.title:
            conversation = await chat_service.update_conversation_title(
                conversation_id=conversation_id,
                new_title=update_data.title
            )
        return ConversationResponse.model_validate(conversation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a conversation and all its associated data."""
    chat_service = ChatService(db)
    try:
        # Verify conversation ownership
        conversation = await chat_service.get_conversation(conversation_id)
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
        await chat_service.delete_conversation(conversation_id)
        
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
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific message from a conversation."""
    chat_service = ChatService(db)
    try:
        # Verify conversation ownership
        conversation = await chat_service.get_conversation(conversation_id)
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
        await chat_service.delete_message(message_id)
        
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
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> List[ConversationListItem]:
    """Update the order of multiple conversations."""
    chat_service = ChatService(db)
    try:
        # Convert to the format expected by the service
        order_data = [{"id": item.id, "order": item.order} for item in conversation_orders]
        
        # Update the orders
        updated_conversations = await chat_service.update_multiple_conversation_orders(
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