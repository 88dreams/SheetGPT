from typing import Dict, List, Optional, Any
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.models.models import Conversation, Message, StructuredData, DataColumn
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
        # First verify the conversation exists
        conversation = await self.get_conversation(conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Use select statement with join loading
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        result = await self.db.execute(stmt)
        messages = result.scalars().all()
        
        # Return empty list if no messages yet
        return messages

    async def get_conversation(self, conversation_id: UUID) -> Conversation:
        """Get a conversation by ID with its messages."""
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        result = await self.db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise ValueError("Conversation not found")
        
        return conversation

    async def get_chat_response(
        self,
        conversation_id: UUID,
        user_message: str,
        structured_format: Optional[Dict] = None
    ):
        """Get streaming response from ChatGPT."""
        # Add user message to conversation
        user_msg = await self.add_message(conversation_id, "user", user_message)

        # Get conversation history
        messages = await self.get_conversation_messages(conversation_id)
        
        # Prepare conversation history for ChatGPT
        chat_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages[-10:]  # Last 10 messages for context
        ]

        # If structured format is requested, add it to the system message
        if structured_format:
            import json
            format_str = json.dumps(structured_format, ensure_ascii=False)
            system_message = {
                "role": "system",
                "content": f"""Please provide responses in two parts:
                1. A natural conversation response
                2. Structured data in the following format: {format_str}
                
                Separate the parts with '---DATA---'"""
            }
            chat_messages.insert(0, system_message)

        # Get response from ChatGPT with streaming
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=chat_messages,
            temperature=0.7,
            max_tokens=2000,
            stream=True  # Enable streaming
        )

        full_response = ""
        async for chunk in response:
            if chunk.choices[0].delta.content is not None:
                content = chunk.choices[0].delta.content
                full_response += content
                yield content

        # Save the complete response
        assistant_msg = await self.add_message(conversation_id, "assistant", full_response)

        # Handle structured data if requested
        if structured_format and "---DATA---" in full_response:
            try:
                conversation_part, data_part = full_response.split("---DATA---")
                data_str = data_part.strip()
                
                # Try to parse the data as JSON if possible
                try:
                    parsed_data = json.loads(data_str)
                except json.JSONDecodeError:
                    parsed_data = {"raw_text": data_str}
                
                # Get conversation for the title
                conversation = await self.get_conversation(conversation_id)
                
                # Transform data into row-based format if it's a dictionary
                transformed_data = {"rows": [], "column_order": []}
                if isinstance(parsed_data, dict):
                    # Get all keys as columns
                    columns = list(parsed_data.keys())
                    transformed_data["column_order"] = columns
                    
                    # Find the maximum length of any column's data
                    max_rows = 1
                    for value in parsed_data.values():
                        if isinstance(value, list):
                            max_rows = max(max_rows, len(value))
                    
                    # Create rows
                    for i in range(max_rows):
                        row = {}
                        for col in columns:
                            value = parsed_data[col]
                            if isinstance(value, list):
                                row[col] = value[i] if i < len(value) else None
                            else:
                                row[col] = value if i == 0 else None
                        transformed_data["rows"].append(row)
                else:
                    transformed_data = {"rows": [{"raw_text": str(parsed_data)}], "column_order": ["raw_text"]}
                
                # Store structured data
                structured_data = StructuredData(
                    conversation_id=conversation_id,
                    data_type="chat_extraction",
                    schema_version="1.0",
                    data=transformed_data,
                    meta_data={
                        "format": structured_format,
                        "message_id": str(assistant_msg.id),
                        "title": conversation.title
                    }
                )
                self.db.add(structured_data)
                await self.db.commit()
                await self.db.refresh(structured_data)

                # Create default columns based on the column order
                columns = []
                for i, col_name in enumerate(transformed_data["column_order"]):
                    # Determine data type from the first row if available
                    data_type = "string"
                    if transformed_data["rows"]:
                        value = transformed_data["rows"][0].get(col_name)
                        if isinstance(value, (int, float)):
                            data_type = "number"
                        elif isinstance(value, bool):
                            data_type = "boolean"
                        elif isinstance(value, dict):
                            data_type = "object"
                        elif isinstance(value, list):
                            data_type = "array"

                    column = DataColumn(
                        structured_data_id=structured_data.id,
                        name=col_name,
                        data_type=data_type,
                        order=i,
                        is_active=True,
                        meta_data={}
                    )
                    columns.append(column)
                
                self.db.add_all(columns)
                await self.db.commit()
                    
            except Exception as e:
                print(f"Error processing structured data: {str(e)}")
                # Continue even if structured data processing fails

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
        query = (
            select(Conversation)
            .where(
                Conversation.user_id == user_id,
                Conversation.deleted_at.is_(None)
            )
            .options(selectinload(Conversation.messages))
            .order_by(Conversation.created_at.desc())
        )
        
        result = await self.db.execute(query.offset(skip).limit(limit))
        return result.scalars().all() 