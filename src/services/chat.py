from typing import Dict, List, Optional, Any
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.models import Conversation, Message, StructuredData
from src.utils.config import get_settings

settings = get_settings()

class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4-turbo-preview"  # Using the latest GPT-4 model

    async def create_conversation(
        self, user_id: UUID, title: str, description: Optional[str] = None
    ) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(
            user_id=user_id,
            title=title,
            description=description,
            meta_data={}
        )
        self.db.add(conversation)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def add_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        meta_data: Optional[Dict] = None
    ) -> Message:
        """Add a message to the conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            meta_data=meta_data or {}
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message

    async def get_conversation_messages(
        self, conversation_id: UUID
    ) -> List[Message]:
        """Get all messages in a conversation."""
        conversation = await self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        return conversation.messages

    async def get_chat_response(
        self,
        conversation_id: UUID,
        user_message: str,
        structured_format: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Get response from ChatGPT and optionally extract structured data."""
        # Add user message to conversation
        await self.add_message(conversation_id, "user", user_message)

        # Get conversation history
        messages = await self.get_conversation_messages(conversation_id)
        
        # Prepare conversation history for ChatGPT
        chat_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages[-10:]  # Last 10 messages for context
        ]

        # If structured format is requested, add it to the system message
        if structured_format:
            system_message = {
                "role": "system",
                "content": f"""Please provide responses in two parts:
                1. A natural conversation response
                2. Structured data in the following format: {structured_format}
                
                Separate the parts with '---DATA---'"""
            }
            chat_messages.insert(0, system_message)

        # Get response from ChatGPT
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=chat_messages,
            temperature=0.7,
            max_tokens=2000,
        )

        # Process the response
        assistant_message = response.choices[0].message.content
        await self.add_message(conversation_id, "assistant", assistant_message)

        # Extract structured data if format was requested
        structured_data = None
        if structured_format and "---DATA---" in assistant_message:
            conversation_part, data_part = assistant_message.split("---DATA---")
            
            # Store structured data
            structured_data = StructuredData(
                conversation_id=conversation_id,
                data_type="chat_extraction",
                schema_version="1.0",
                data={"raw_data": data_part.strip()},
                meta_data={"format": structured_format}
            )
            self.db.add(structured_data)
            await self.db.commit()
            await self.db.refresh(structured_data)

            return {
                "message": conversation_part.strip(),
                "structured_data": structured_data.data
            }

        return {
            "message": assistant_message,
            "structured_data": None
        }

    async def update_conversation_title(
        self,
        conversation_id: UUID,
        new_title: str
    ) -> Conversation:
        """Update the title of a conversation."""
        conversation = await self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        conversation.title = new_title
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def get_user_conversations(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 10
    ) -> List[Conversation]:
        """Get all conversations for a user with pagination."""
        from sqlalchemy import select
        query = select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.deleted_at.is_(None)
        ).order_by(Conversation.created_at.desc())
        
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all() 