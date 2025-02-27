from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    ChatResponse,
    ConversationList
)
from src.services.chat import ChatService
from src.utils.database import get_db
from src.utils.security import get_current_user_id

router = APIRouter()

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ConversationResponse:
    """Create a new conversation."""
    chat_service = ChatService(db)
    conversation = await chat_service.create_conversation(
        user_id=current_user_id,
        title=conversation.title,
        description=conversation.description
    )
    return ConversationResponse.model_validate(conversation)

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
        items=conversations,
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
        messages = await chat_service.get_conversation_messages(conversation_id)
        if not messages:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        conversation = messages[0].conversation
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

@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
async def create_message(
    conversation_id: UUID,
    message: MessageCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    """Send a message and get a response from ChatGPT."""
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
                detail="Not authorized to access this conversation"
            )

        # Get response from ChatGPT
        response = await chat_service.get_chat_response(
            conversation_id=conversation_id,
            user_message=message.content,
            structured_format=message.structured_format
        )
        return ChatResponse(**response)
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