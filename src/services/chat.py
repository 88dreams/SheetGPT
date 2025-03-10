from typing import Dict, List, Optional, Any, AsyncGenerator
from uuid import UUID
import aiohttp
import anthropic
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import asyncio
import json
from datetime import datetime

from src.models.models import Conversation, Message, StructuredData, DataColumn
from src.utils.config import get_settings
from src.config.logging_config import chat_logger

settings = get_settings()

class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = anthropic.AsyncClient(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-7-sonnet-20250219"  # Using Claude 3.7 Sonnet
        self.logger = chat_logger

    async def perform_search(self, query: str) -> str:
        """Perform a single web search with basic error handling."""
        self.logger.info(f"Starting web search for query: {query}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        async with aiohttp.ClientSession() as session:
            try:
                encoded_query = query.replace(' ', '+')
                search_url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_redirect=1&no_html=1"
                self.logger.debug(f"Search URL: {search_url}")
                
                async with session.get(search_url, headers=headers, timeout=10) as response:
                    if response.status != 200:
                        error_msg = f"Search failed with status {response.status}"
                        self.logger.error(error_msg)
                        return error_msg
                    
                    response_text = await response.text()
                    if response_text.startswith('(') and response_text.endswith(')'):
                        response_text = response_text[1:-1]
                    
                    data = json.loads(response_text)
                    topics = data.get('RelatedTopics', [])
                    
                    if not topics:
                        self.logger.warning("No search results found")
                        return "No results found"
                    
                    results = "\nSearch Results (source URLs only):\n"
                    for idx, topic in enumerate(topics[:10], 1):
                        if 'FirstURL' in topic:
                            results += f"{idx}. {topic['FirstURL']}\n"
                    
                    self.logger.info(f"Found {len(topics[:10])} search results")
                    return results
                    
            except Exception as e:
                error_msg = f"Search error: {str(e)}"
                self.logger.error(error_msg, exc_info=True)
                return error_msg

    async def handle_search(self, query: str) -> AsyncGenerator[str, None]:
        """Handle a single search operation with retries and timeouts."""
        self.logger.info(f"Starting search handling for query: {query}")
        try:
            search_state = {
                'attempts': 0,
                'max_attempts': 2
            }
            
            self.logger.debug("Yielding SEARCHING phase")
            yield "[PHASE:SEARCHING]\n"
            
            result = None
            while search_state['attempts'] < search_state['max_attempts']:
                try:
                    self.logger.debug(f"Search attempt {search_state['attempts'] + 1} of {search_state['max_attempts']}")
                    self.logger.info(f"Searching for: {query}")
                    
                    # Set a timeout for the search operation
                    try:
                        # Create a task with timeout
                        search_task = asyncio.create_task(self.perform_search(query))
                        result = await asyncio.wait_for(search_task, timeout=10.0)  # 10 second timeout
                        
                        if result:
                            self.logger.info(f"Search successful on attempt {search_state['attempts'] + 1}")
                            yield result
                            break
                        
                        search_state['attempts'] += 1
                        self.logger.warning(f"No results on attempt {search_state['attempts']}, trying again...")
                    
                    except asyncio.TimeoutError:
                        search_state['attempts'] += 1
                        self.logger.error(f"Search timed out on attempt {search_state['attempts']}")
                        if search_state['attempts'] >= search_state['max_attempts']:
                            error_msg = f"\nSearch timed out after {search_state['attempts']} attempts\n"
                            self.logger.error("Search timed out on all attempts")
                            yield error_msg
                            break
                        self.logger.info("Will retry search after timeout...")
                        await asyncio.sleep(0.5)
                        
                except Exception as e:
                    search_state['attempts'] += 1
                    self.logger.error(f"Search attempt {search_state['attempts']} failed: {str(e)}", exc_info=True)
                    if search_state['attempts'] >= search_state['max_attempts']:
                        error_msg = f"\nSearch failed after {search_state['attempts']} attempts: {str(e)}\n"
                        self.logger.error("Search failed all attempts", exc_info=True)
                        yield error_msg
                        break
                    self.logger.info("Will retry in 1 second...")
                    await asyncio.sleep(1)
            
            if search_state['attempts'] >= search_state['max_attempts'] and not result:
                self.logger.warning("No results found after all attempts")
                yield "\nNo results found after all attempts.\n"
                
        except Exception as e:
            self.logger.error(f"Unexpected error in handle_search: {str(e)}", exc_info=True)
            yield f"\nAn unexpected error occurred: {str(e)}\n"
        finally:
            self.logger.debug("Search completed, yielding PROCESSING phase")
            yield "[PHASE:PROCESSING]\n"

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
        """Get streaming response from Claude."""
        try:
            self.logger.info(f"\n=== New Chat Request ===")
            self.logger.info(f"User message: {user_message}")
            self.logger.info(f"Structured format requested: {structured_format is not None}")
            
            # Add user message to conversation
            await self.add_message(conversation_id, "user", user_message)
            
            # Get conversation history
            messages = await self.get_conversation_messages(conversation_id)
            
            # Create system prompt for Claude
            system_prompt = """You are a researcher for sports, and esports-related data and metadata.
                1. Use [SEARCH]query[/SEARCH] tags for web searches
                2. Wait for search results before continuing
                3. Cite sources by just mentioning the URL - do not include large quotes or text passages from URLs
                4. Be concise and focus on facts, not verbose explanations from sources
                
                For structured data requests:
                1. Provide a brief natural language response (1-2 paragraphs maximum)
                2. Add '---DATA---' on a new line
                3. Provide structured data in JSON format
                4. Ensure all required fields are included
                5. Format numbers and dates consistently"""
            
            # Add format instructions if needed
            if structured_format:
                system_prompt += f"""\n\nThis request requires structured data output.
                    After your natural language response, you MUST:
                    1. Add a line containing only '---DATA---'
                    2. Then provide data in this exact format: {json.dumps(structured_format)}
                    3. Ensure all required fields are present and properly formatted"""
            
            # Log the system prompt
            self.logger.info(f"System instructions: {system_prompt}")
            
            # Convert messages to Claude format (user/assistant alternating)
            anthropic_messages = []
            
            # Claude's API expects a simpler format than OpenAI
            # We'll take the most recent messages (up to 15)
            recent_messages = messages[-15:]
            
            for msg in recent_messages:
                if msg.role in ["user", "assistant"]:
                    anthropic_messages.append({
                        "role": msg.role, 
                        "content": msg.content
                    })
            
            # Initialize response
            full_response = ""
            buffer = ""
            
            # Log the exact messages we're sending to the API
            self.logger.info(f"Sending request to Claude API with {len(anthropic_messages)} messages")
            if anthropic_messages:
                self.logger.info(f"Last message: {anthropic_messages[-1]['content'][:100]}...")
            
            # Start streaming response
            self.logger.info("Starting response stream with Claude")
            yield "[RESPONSE_START]\n"
            
            # Create a message with Claude
            message_stream = await self.client.messages.create(
                model=self.model,
                max_tokens=15000,  # Increased limit to handle large structured data responses
                system=system_prompt,
                messages=anthropic_messages,
                temperature=0.3,
                stream=True
            )
            
            async for chunk in message_stream:
                if chunk.type == "content_block_delta" and chunk.delta.text:
                    content = chunk.delta.text
                    self.logger.debug(f"Received chunk from Claude: {len(content)} chars")
                    buffer += content
                    
                    # Handle search requests
                    while '[SEARCH]' in buffer and '[/SEARCH]' in buffer:
                        start = buffer.find('[SEARCH]')
                        end = buffer.find('[/SEARCH]')
                        
                        if start > -1 and end > start:
                            self.logger.debug("Search tag detected")  # Debug log
                            # Extract search parts
                            pre_search = buffer[:start]
                            search_query = buffer[start + 8:end].strip()
                            post_search = buffer[end + 9:]
                            
                            # Handle pre-search content
                            if pre_search:
                                self.logger.debug(f"Yielding pre-search content: {len(pre_search)} chars")  # Debug log
                                full_response += pre_search
                                yield pre_search
                            
                            self.logger.info(f"Starting search for: {search_query}")  # Debug log
                            # Perform search
                            try:
                                search_result = await self.perform_search(search_query)
                                # Format search results with clear markers - more concise format
                                result_block = f"\n=== Sources ===\n{search_result}\n================\n"
                                self.logger.debug(f"Search completed, yielding {len(result_block)} chars")  # Debug log
                                full_response += result_block
                                yield result_block
                                
                                # Add a small delay to ensure frontend processes the results
                                await asyncio.sleep(0.5)
                            except Exception as e:
                                error_msg = f"\nSearch failed: {str(e)}\n"
                                self.logger.error(f"Search error: {str(e)}")  # Debug log
                                full_response += error_msg
                                yield error_msg
                            
                            # Continue with post-search content
                            buffer = post_search
                            self.logger.info("Search processing complete")  # Debug log
                        else:
                            break
                    
                    # Process complete sentences
                    while '. ' in buffer:
                        idx = buffer.find('. ') + 2
                        sentence = buffer[:idx]
                        buffer = buffer[idx:]
                        self.logger.debug(f"Yielding sentence: {len(sentence)} chars")  # Debug log
                        full_response += sentence
                        yield sentence
                        # Small delay between sentences
                        await asyncio.sleep(0.1)
                    
                    # Handle large chunks
                    if len(buffer) > 100:
                        self.logger.debug(f"Yielding large chunk: {len(buffer)} chars")  # Debug log
                        chunk_to_send = buffer
                        full_response += chunk_to_send
                        yield chunk_to_send
                        buffer = ""
                        # Small delay after large chunks
                        await asyncio.sleep(0.1)
            
            # Handle remaining content
            if buffer:
                self.logger.debug(f"Yielding final buffer: {len(buffer)} chars")  # Debug log
                full_response += buffer
                yield buffer
            
            self.logger.info("Stream complete, saving response")  # Debug log
            # Save response
            await self.add_message(conversation_id, "assistant", full_response)
            
            # Handle structured data if present
            if "---DATA---" in full_response:
                self.logger.info("Processing structured data")  # Debug log
                try:
                    _, data_part = full_response.split("---DATA---")
                    data = json.loads(data_part.strip())
                    
                    structured_data = StructuredData(
                        conversation_id=conversation_id,
                        data_type="chat_extraction",
                        schema_version="1.0",
                        data=data,
                        meta_data={"format": structured_format} if structured_format else {}
                    )
                    self.db.add(structured_data)
                    await self.db.commit()
                    self.logger.info("Structured data saved")  # Debug log
                    
                except Exception as e:
                    error_msg = f"\nError processing structured data: {str(e)}\n"
                    self.logger.error(f"Structured data error: {str(e)}")  # Debug log
                    yield error_msg
            
            self.logger.info("Response complete - sending finalization marker")
            # Send final phase marker and wait to ensure it's processed
            yield "[PHASE:COMPLETE]\n"
            await asyncio.sleep(0.5)
            
            # Send the stream end marker with a delay to ensure it's processed separately
            self.logger.info("Sending final stream end marker")
            yield "[STREAM_END]\n"
            await asyncio.sleep(0.5)
            
            # Send the completion marker that the frontend is looking for
            self.logger.info("Sending stream complete marker")
            yield "__STREAM_COMPLETE__"
            
        except Exception as e:
            self.logger.error(f"Error in chat response: {str(e)}")
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
        # First, check if we have ordered conversations
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .where(Conversation.order != None)
            .order_by(Conversation.order)
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        ordered_conversations = list(result.scalars().all())
        
        # If we have ordered conversations and they match our limit, return them
        if ordered_conversations and len(ordered_conversations) == limit:
            return ordered_conversations
        
        # If we have some ordered conversations but not enough to meet the limit,
        # fetch additional unordered conversations
        if ordered_conversations:
            # Calculate how many more we need
            additional_needed = limit - len(ordered_conversations)
            
            # Get ids of conversations we already have
            existing_ids = [c.id for c in ordered_conversations]
            
            # Fetch additional conversations that don't have order set
            stmt = (
                select(Conversation)
                .where(Conversation.user_id == user_id)
                .where(Conversation.id.not_in(existing_ids))
                .where(Conversation.order == None)
                .order_by(Conversation.updated_at.desc())
                .limit(additional_needed)
            )
            result = await self.db.execute(stmt)
            unordered_conversations = list(result.scalars().all())
            
            # Combine both sets
            return ordered_conversations + unordered_conversations
        
        # If no ordered conversations, fall back to original ordering by updated_at
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
        
    async def update_conversation_order(self, conversation_id: UUID, new_order: int) -> Conversation:
        """Update the order of a conversation."""
        conversation = await self.db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        conversation.order = new_order
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation
        
    async def update_multiple_conversation_orders(self, user_id: UUID, conversation_orders: List[Dict[UUID, int]]) -> List[Conversation]:
        """Update the order of multiple conversations at once."""
        conversations = []
        
        for order_data in conversation_orders:
            conversation_id = order_data["id"]
            new_order = order_data["order"]
            
            # Verify the conversation belongs to the user
            conversation = await self.db.get(Conversation, conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
                
            if conversation.user_id != user_id:
                raise ValueError(f"Conversation {conversation_id} does not belong to this user")
                
            # Update the order
            conversation.order = new_order
            conversations.append(conversation)
        
        # Commit all changes at once
        await self.db.commit()
        
        # Refresh all conversations
        for conversation in conversations:
            await self.db.refresh(conversation)
            
        return conversations 