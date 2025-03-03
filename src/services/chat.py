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
        try:
            # Add user message to conversation
            user_msg = await self.add_message(conversation_id, "user", user_message)

            # Get conversation history
            messages = await self.get_conversation_messages(conversation_id)
            
            # Prepare conversation history for ChatGPT
            chat_messages = [
                {"role": msg.role, "content": msg.content}
                for msg in messages[-15:]  # Last 15 messages for context
            ]

            # Add base system message
            base_system_message = {
                "role": "system",
                "content": """You are a helpful assistant that provides accurate and thorough responses.
                When you need real-time or up-to-date information:
                1. Indicate that you need to search the web
                2. Use the phrase '[SEARCH]query[/SEARCH]' to perform web searches
                3. Incorporate the search results into your response
                4. Always cite your sources with URLs when using web information

                When asked for structured data, you will:
                1. First provide a natural language response
                2. Then provide the structured data exactly as requested
                3. Always separate the two parts with '---DATA---'
                4. For data requests, verify information is accurate and complete
                5. Include all relevant fields in the structured data
                6. Format numbers and dates consistently"""
            }
            chat_messages.insert(0, base_system_message)

            # If structured format is requested, add it as an additional system message
            if structured_format:
                import json
                format_str = json.dumps(structured_format, ensure_ascii=False)
                format_system_message = {
                    "role": "system",
                    "content": f"""For this response, you MUST:
                    1. Provide a natural conversation response
                    2. Then provide structured data in this EXACT format: {format_str}
                    3. Separate the two parts with '---DATA---'
                    4. Ensure ALL required fields are included
                    5. Format the data as valid JSON"""
                }
                chat_messages.insert(1, format_system_message)

            print(f"Sending request to OpenAI with {len(chat_messages)} messages")

            # Get response from ChatGPT with streaming
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=chat_messages,
                temperature=0.3,  # Set to 0.3 for more focused, data-oriented responses
                max_tokens=4000,
                stream=True  # Enable streaming
            )

            full_response = ""
            buffer = ""
            search_query = None

            async for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content = chunk.choices[0].delta.content
                    buffer += content

                    # Check for complete search tags
                    while '[SEARCH]' in buffer and '[/SEARCH]' in buffer:
                        start = buffer.find('[SEARCH]')
                        end = buffer.find('[/SEARCH]')
                        if start < end:
                            # Extract search query
                            search_query = buffer[start + 8:end].strip()
                            
                            # Remove the search tags from buffer
                            buffer = buffer[:start] + buffer[end + 9:]
                            
                            try:
                                # Perform web search
                                import aiohttp
                                async with aiohttp.ClientSession() as session:
                                    search_url = f"https://api.duckduckgo.com/?q={search_query}&format=json"
                                    async with session.get(search_url) as search_response:
                                        search_data = await search_response.json()
                                        
                                        # Format search results
                                        search_results = "\n\nSearch Results:\n"
                                        for result in search_data.get('RelatedTopics', [])[:3]:
                                            if 'Text' in result:
                                                search_results += f"- {result['Text']}\n"
                                        
                                        # Add search results to buffer
                                        buffer += search_results
                            except Exception as e:
                                print(f"Error performing web search: {str(e)}")
                                buffer += f"\n\nError performing web search: {str(e)}\n"

                    # Yield any complete sentences from buffer
                    while '. ' in buffer:
                        period_idx = buffer.find('. ') + 2
                        sentence = buffer[:period_idx]
                        buffer = buffer[period_idx:]
                        full_response += sentence
                        yield sentence

                    # If we have a long enough chunk without a period, yield it
                    if len(buffer) > 100:
                        full_response += buffer
                        yield buffer
                        buffer = ""

            # Yield any remaining content in buffer
            if buffer:
                full_response += buffer
                yield buffer

            print(f"Full response received, length: {len(full_response)}")

            # Save the complete response
            assistant_msg = await self.add_message(conversation_id, "assistant", full_response)

            # Handle structured data if requested
            if structured_format and "---DATA---" in full_response:
                try:
                    conversation_part, data_part = full_response.split("---DATA---")
                    data_str = data_part.strip()
                    
                    # Try to parse the data as JSON
                    try:
                        parsed_data = json.loads(data_str)
                    except json.JSONDecodeError:
                        print(f"Failed to parse JSON data: {data_str}")
                        parsed_data = {"raw_text": data_str}
                    
                    # Get conversation for the title
                    conversation = await self.get_conversation(conversation_id)
                    
                    # Store structured data
                    structured_data = StructuredData(
                        conversation_id=conversation_id,
                        data_type="chat_extraction",
                        schema_version="1.0",
                        data=parsed_data,
                        meta_data={
                            "format": structured_format,
                            "message_id": str(assistant_msg.id),
                            "title": conversation.title
                        }
                    )
                    self.db.add(structured_data)
                    await self.db.commit()
                    
                except Exception as e:
                    print(f"Error processing structured data: {str(e)}")
                    # Continue even if structured data processing fails

        except Exception as e:
            print(f"Error in get_chat_response: {str(e)}")
            # Add error message to conversation
            await self.add_message(
                conversation_id,
                "assistant",
                f"I apologize, but I encountered an error: {str(e)}"
            )
            raise

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
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_conversation(self, conversation_id: UUID) -> None:
        """Delete a conversation and all its associated messages."""
        # Get conversation with a single query
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
        )
        result = await self.db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Delete the conversation - this will cascade delete all related records
        # due to the cascade="all, delete-orphan" setting in the model
        await self.db.delete(conversation)
        await self.db.commit()

    async def delete_message(self, message_id: UUID) -> None:
        """Delete a specific message from a conversation."""
        # Get message with a single query
        stmt = (
            select(Message)
            .where(Message.id == message_id)
        )
        result = await self.db.execute(stmt)
        message = result.scalar_one_or_none()
        
        if not message:
            raise ValueError("Message not found")
        
        # Delete the message
        await self.db.delete(message)
        await self.db.commit() 