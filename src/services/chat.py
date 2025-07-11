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
from src.schemas.chat import ConversationUpdate
from src.utils.config import get_settings
from src.utils.database import get_db
from src.config.logging_config import chat_logger

settings = get_settings()


class ChatService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(ChatService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        # Prevent re-initialization
        if hasattr(self, '_initialized'):
            return
        self._initialized = True

        self.logger = chat_logger
        self.logger.info("ChatService initializing...")

        # Initialize Anthropic client
        self.anthropic_client = None
        self.claude_models = {}
        self.default_anthropic_model_name = "claude-sonnet-4-20250514" # Fallback
        try:
            self.anthropic_client = anthropic.AsyncClient(api_key=settings.ANTHROPIC_API_KEY)
            self.claude_models = {
                "claude_default": "claude-sonnet-4-20250514",
                "claude_sonnet_3": "claude-3-sonnet-20240229",
                "claude_opus_3": "claude-3-opus-20240229",
                "claude_haiku_3": "claude-3-haiku-20240307",
            }
            self.default_anthropic_model_name = self.claude_models["claude_default"]
            self.logger.info("Anthropic client initialized successfully.")
        except Exception as e:
            self.logger.error(f"Failed to initialize Anthropic client: {e}", exc_info=True)
            self.anthropic_client = None
            self.claude_models = {}

        # Initialize OpenAI client
        self.openai_client = None
        self.openai_models = {}
        self.default_openai_model_name = "gpt-3.5-turbo"  # A default placeholder

        if settings.OPENAI_API_KEY:
            try:
                import openai
                self.openai_client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                self.openai_models = {
                    "chatgpt_3_5_turbo": "gpt-3.5-turbo",
                    "chatgpt_4_turbo": "gpt-4-turbo-preview",
                    "chatgpt_4o": "gpt-4o",
                }
                self.default_openai_model_name = self.openai_models["chatgpt_3_5_turbo"]
                self.logger.info("OpenAI client initialized.")
            except ImportError:
                self.logger.warning("OpenAI library not found. ChatGPT features will be unavailable.")
            except Exception as e:
                self.logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
                # Reset to safe defaults
                self.openai_client = None
                self.openai_models = {}
        else:
            self.logger.warning("OPENAI_API_KEY not set. ChatGPT features will be unavailable.")

        self.logger.info("ChatService initialization complete.")

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
        self, db: AsyncSession, user_id: UUID, title: str, description: Optional[str] = None, tags: Optional[List[str]] = None
    ) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(
            user_id=user_id,
            title=title,
            description=description,
            meta_data={},
            tags=tags or []
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation

    async def add_message(
        self,
        db: AsyncSession,
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
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_conversation_messages(
        self, db: AsyncSession, conversation_id: UUID
    ) -> List[Message]:
        """Get all messages in a conversation."""
        # First verify the conversation exists
        conversation = await db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Use select statement to get messages directly
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        result = await db.execute(stmt)
        messages = result.scalars().all()
        
        # Return empty list if no messages yet
        return list(messages)

    async def get_conversation(self, db: AsyncSession, conversation_id: UUID) -> Conversation:
        """Get a conversation by ID without its messages for efficiency."""
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise ValueError("Conversation not found")

        # To access messages, they should be loaded explicitly where needed
        # For example: await self.db.refresh(conversation, attribute_names=['messages'])
        return conversation

    async def get_conversation_by_id(self, db: AsyncSession, conversation_id: UUID) -> Optional[Conversation]:
        """Get a conversation by its ID."""
        stmt = select(Conversation).where(Conversation.id == conversation_id).options(selectinload(Conversation.messages))
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_chat_response(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        user_message: str,
        structured_format: Optional[Dict] = None,
        selected_llm: Optional[str] = None
    ):
        try:
            self.logger.info(f"get_chat_response: Starting for conversation {conversation_id}")
            self.logger.info(f"get_chat_response: User message: '{user_message[:100]}...'")
            self.logger.info(f"get_chat_response: Structured format requested: {bool(structured_format)}")
            self.logger.info(f"get_chat_response: Selected LLM alias: {selected_llm}")

            await self.add_message(db, conversation_id, "user", user_message)
            
            # Now, get the conversation object first
            conversation = await self.get_conversation(db, conversation_id)
            if not conversation:
                self.logger.error(f"Conversation with ID {conversation_id} not found after adding message.")
                raise ValueError(f"Conversation {conversation_id} not found.")

            # Then, load the messages
            messages = await self.get_conversation_messages(db, conversation_id)
            recent_messages = messages[-15:]
            self.logger.info(f"get_chat_response: Fetched {len(recent_messages)} recent messages")

            llm_provider = "claude"
            actual_model_name = self.default_anthropic_model_name

            if selected_llm:
                self.logger.info(f"get_chat_response: Evaluating selected LLM '{selected_llm}'")
                if selected_llm.startswith("chatgpt_"):
                    llm_provider = "chatgpt"
                    self.logger.info(f"get_chat_response: LLM is a ChatGPT model. Current openai_models: {self.openai_models.keys()}")
                    actual_model_name = self.openai_models.get(selected_llm, self.default_openai_model_name)
                elif selected_llm.startswith("claude_"):
                    llm_provider = "claude"
                    actual_model_name = self.claude_models.get(selected_llm, self.default_anthropic_model_name)
            
            self.logger.info(f"get_chat_response: Determined provider: '{llm_provider}', Model: '{actual_model_name}'")

            if llm_provider == 'chatgpt':
                self.logger.info("get_chat_response: Entering ChatGPT processing block.")
                if not self.openai_client:
                    self.logger.error("get_chat_response: OpenAI client is not available. Aborting.")
                    yield "[ERROR] OpenAI client not configured or library not installed.\n"
                    yield "[STREAM_END]\n"
                    yield "__STREAM_COMPLETE__"
                    return
                
                self.logger.info("get_chat_response: Preparing messages for OpenAI.")
                openai_system_prompt_parts = [
                    "You are a helpful assistant.",
                    "When providing a natural language response followed by structured data, you MUST follow these rules:",
                    "1. First, provide your natural language response.",
                    "2. After the natural language response, add a line containing only '---DATA---' (three hyphens, DATA, three hyphens).",
                    "3. After the '---DATA---' line, provide the structured data as a single JSON object.",
                    "4. Ensure your entire response, including any text after the JSON data, is complete before the stream ends."
                ]

                if structured_format:
                    openai_system_prompt_parts.extend([
                        "This specific request requires structured data.",
                        f"The JSON data MUST conform to the following structure: {json.dumps(structured_format)}",
                        "Ensure all required fields from this structure are present in your JSON output."
                    ])
                
                openai_system_prompt = "\n".join(openai_system_prompt_parts)
                self.logger.info(f"get_chat_response: OpenAI System Prompt: {openai_system_prompt}")
                
                openai_messages = []
                if openai_system_prompt:
                    openai_messages.append({"role": "system", "content": openai_system_prompt})
                for msg in recent_messages:
                    if msg.role in ["user", "assistant"] and hasattr(msg, 'content'):
                        openai_messages.append({"role": msg.role, "content": msg.content})
                self.logger.info(f"get_chat_response: Prepared {len(openai_messages)} messages for OpenAI.")

                yield "[RESPONSE_START]\n"
                full_openai_response = ""
                try:
                    stream = await self.openai_client.chat.completions.create(
                        model=actual_model_name,
                        messages=openai_messages,
                        stream=True,
                        temperature=0.5,
                    )
                    
                    async for chunk in stream:
                        content = chunk.choices[0].delta.content or ""
                        if content:
                            full_openai_response += content
                            yield content
                    
                    await self.add_message(db, conversation_id, "assistant", full_openai_response)
                    self.logger.info("ChatGPT response received and sent.")

                except Exception as e:
                    self.logger.error(f"Error during OpenAI API call: {e}", exc_info=True)
                    yield f"[ERROR] OpenAI API call failed: {str(e)}\n"
                
                self.logger.info("get_chat_response: Response complete - sending finalization marker (ChatGPT)")
                yield "[STREAM_END]\n"
                self.logger.info("get_chat_response: Sending stream complete marker (ChatGPT)")
                yield "__STREAM_COMPLETE__"
                return

            self.logger.info(f"get_chat_response: Processing with Claude (Anthropic model: {actual_model_name})")
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
            if structured_format:
                system_prompt += f"""\n\nThis request requires structured data output.
                    After your natural language response, you MUST:
                    1. Add a line containing only '---DATA---'
                    2. Then provide data in this exact format: {json.dumps(structured_format)}
                    3. Ensure all required fields are present and properly formatted"""
            self.logger.info(f"get_chat_response: System instructions (Claude): {system_prompt}")
            
            anthropic_messages = []
            for msg in recent_messages:
                if msg.role in ["user", "assistant"]:
                    anthropic_messages.append({"role": msg.role, "content": msg.content})
            
            self.logger.info(f"get_chat_response: Sending request to Claude API with {len(anthropic_messages)} messages")
            if anthropic_messages: self.logger.info(f"get_chat_response: Last message (Claude): {anthropic_messages[-1]['content'][:100]}...")
            
            yield "[RESPONSE_START]\n"
            
            message_stream = await self.anthropic_client.messages.create(
                model=actual_model_name,
                max_tokens=15000, 
                system=system_prompt,
                messages=anthropic_messages,
                temperature=0.3,
                stream=True
            )
            
            full_response = ""
            buffer = ""
            async for chunk in message_stream:
                if chunk.type == "content_block_delta" and chunk.delta.type == "text_delta":
                    content = chunk.delta.text
                    self.logger.debug(f"Received chunk from Claude: {len(content)} chars")
                    buffer += content
                    
                    while '[SEARCH]' in buffer and '[/SEARCH]' in buffer:
                        start = buffer.find('[SEARCH]')
                        end = buffer.find('[/SEARCH]')
                        if start > -1 and end > start:
                            pre_search = buffer[:start]
                            search_query = buffer[start + 8:end].strip()
                            post_search = buffer[end + 9:]
                            if pre_search: full_response += pre_search; yield pre_search
                            self.logger.info(f"Starting search for: {search_query}")
                            try:
                                search_result = await self.perform_search(search_query)
                                result_block = f"\n=== Sources ===\n{search_result}\n================\n"
                                full_response += result_block; yield result_block
                                await asyncio.sleep(0.5)
                            except Exception as e:
                                error_msg = f"\nSearch failed: {str(e)}\n"; full_response += error_msg; yield error_msg
                            buffer = post_search
                        else: break
                    
                    while '. ' in buffer:
                        idx = buffer.find('. ') + 2
                        sentence = buffer[:idx]; buffer = buffer[idx:]
                        full_response += sentence; yield sentence
                        await asyncio.sleep(0.1)
                    
                    if len(buffer) > 100:
                        chunk_to_send = buffer; full_response += chunk_to_send; yield chunk_to_send; buffer = ""
                        await asyncio.sleep(0.1)
            
            if buffer: full_response += buffer; yield buffer
            self.logger.info("get_chat_response: Claude stream complete, saving response")
            await self.add_message(db, conversation_id, "assistant", full_response)
            
            if "---DATA---" in full_response:
                self.logger.info("get_chat_response: Processing structured data")
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
                    db.add(structured_data)
                    await db.commit()
                    self.logger.info("get_chat_response: Structured data saved")
                    
                except Exception as e:
                    error_msg = f"\nError processing structured data: {str(e)}\n"
                    self.logger.error(f"get_chat_response: Structured data error: {str(e)}")
                    yield error_msg
            
            self.logger.info("get_chat_response: Response complete - sending finalization marker (Claude)")
            yield "[PHASE:COMPLETE]\n"; await asyncio.sleep(0.5)
            self.logger.info("get_chat_response: Sending final stream end marker (Claude)")
            yield "[STREAM_END]\n"; await asyncio.sleep(0.5)
            self.logger.info("get_chat_response: Sending stream complete marker (Claude)")
            yield "__STREAM_COMPLETE__"
            
        except BaseException as e:
            self.logger.error(f"A critical error occurred in get_chat_response: {str(e)}", exc_info=True)
            yield f"[ERROR] A critical server error occurred: {str(e)}\n"
            yield "[STREAM_END]\n"
            yield "__STREAM_COMPLETE__"

    async def update_conversation(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        update_data: "ConversationUpdate"
    ) -> Conversation:
        """Update a conversation with new data."""
        conversation = await self.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")

        if update_data.title is not None:
            conversation.title = update_data.title
        if update_data.tags is not None:
            conversation.tags = update_data.tags
        
        await db.commit()
        await db.refresh(conversation)
        return conversation

    async def get_user_conversations(
        self,
        db: AsyncSession,
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
        result = await db.execute(stmt)
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
            result = await db.execute(stmt)
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
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def delete_conversation(self, db: AsyncSession, conversation_id: UUID) -> None:
        """Delete a conversation and all its associated messages."""
        # Get conversation with a single query
        stmt = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise ValueError("Conversation not found")
        
        # Delete the conversation - this will cascade delete all related records
        # due to the cascade="all, delete-orphan" setting in the model
        await db.delete(conversation)
        await db.commit()

    async def delete_message(self, db: AsyncSession, message_id: UUID) -> None:
        """Delete a specific message from a conversation."""
        # Get message with a single query
        stmt = (
            select(Message)
            .where(Message.id == message_id)
        )
        result = await db.execute(stmt)
        message = result.scalar_one_or_none()
        
        if not message:
            raise ValueError("Message not found")
        
        # Delete the message
        await db.delete(message)
        await db.commit()
        
    async def update_conversation_order(self, db: AsyncSession, conversation_id: UUID, new_order: int) -> Conversation:
        """Update the order of a conversation."""
        conversation = await db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        conversation.order = new_order
        await db.commit()
        await db.refresh(conversation)
        return conversation
        
    async def update_multiple_conversation_orders(self, db: AsyncSession, user_id: UUID, conversation_orders: List[Dict[str, Any]]) -> List[Conversation]:
        """Update the order of multiple conversations at once."""
        conversations = []
        
        for order_data in conversation_orders:
            conversation_id = order_data["id"]
            new_order = order_data["order"]
            
            # Verify the conversation belongs to the user
            conversation = await db.get(Conversation, conversation_id)
            if not conversation:
                raise ValueError(f"Conversation {conversation_id} not found")
                
            if conversation.user_id != user_id:
                raise ValueError(f"Conversation {conversation_id} does not belong to this user")
                
            # Update the order
            conversation.order = new_order
            conversations.append(conversation)
        
        # Commit all changes at once
        await db.commit()
        
        # Refresh all conversations
        for conversation in conversations:
            await db.refresh(conversation)
            
        return conversations

    async def update_conversation_tags(
        self,
        db: AsyncSession,
        conversation_id: UUID,
        new_tags: List[str]
    ) -> Conversation:
        """Update the tags of a conversation."""
        conversation = await db.get(Conversation, conversation_id)
        if not conversation:
            raise ValueError("Conversation not found")
        
        conversation.tags = new_tags
        await db.commit()
        await db.refresh(conversation)
        return conversation 