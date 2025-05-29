from typing import AsyncGenerator, Dict, Any, Optional, List, Union
import logging
import httpx
import anthropic
from anthropic.types import MessageParam, ContentBlockDeltaEvent
from fastapi import HTTPException
from src.core.config import settings

logger = logging.getLogger(__name__)

class AnthropicServiceError(Exception):
    """Custom exception for anthropic service errors"""
    pass

class AnthropicService:
    """Service for interacting with the Anthropic Claude API"""
    
    # Default model configuration
    DEFAULT_MODEL = "claude-3-7-sonnet-20250219"
    DEFAULT_MAX_TOKENS = 15000
    DEFAULT_TEMPERATURE = 0.7
    # DEFAULT_REQUEST_TIMEOUT = 28 # Default timeout in seconds for non-streaming requests
    
    def __init__(
        self, 
        api_key: Optional[str] = None, 
        model: Optional[str] = None,
        default_max_tokens: int = DEFAULT_MAX_TOKENS,
        default_temperature: float = DEFAULT_TEMPERATURE,
        # request_timeout: int = DEFAULT_REQUEST_TIMEOUT
    ):
        """
        Initialize the Anthropic service
        
        Args:
            api_key: Anthropic API key (defaults to settings.ANTHROPIC_API_KEY)
            model: Claude model to use (defaults to DEFAULT_MODEL)
            default_max_tokens: Default max_tokens parameter for completions
            default_temperature: Default temperature parameter for completions
        """
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or self.DEFAULT_MODEL
        self.default_max_tokens = default_max_tokens
        self.default_temperature = default_temperature
        self.request_timeout = settings.ANTHROPIC_REQUEST_TIMEOUT # Get from settings
        
        # Initialize clients
        self._init_clients()
        
    def _init_clients(self) -> None:
        """Initialize API clients"""
        try:
            # Pass timeout to the client constructor if possible, or use it per-request.
            # For anthropic.Client, timeout is typically passed per-request.
            self.client = anthropic.Client(
                api_key=self.api_key,
                # It's common for clients to also accept a default timeout here
                # timeout=httpx.Timeout(self.request_timeout, connect=5.0)
            )
            self.async_client = httpx.AsyncClient(
                # timeout=httpx.Timeout(self.request_timeout, connect=5.0) # For async client if used directly
            )
            logger.info(f"Initialized Anthropic client with model: {self.model} and request_timeout: {self.request_timeout}s")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic client: {str(e)}")
            raise AnthropicServiceError(f"Client initialization failed: {str(e)}")
    
    def _create_message_params(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Create parameters for message creation
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate (overrides default)
            temperature: Temperature for generation (overrides default)
            
        Returns:
            Dictionary of parameters for message creation
        """
        messages: List[MessageParam] = [{"role": "user", "content": prompt}]
        
        params = {
            "model": self.model,
            "max_tokens": max_tokens or self.default_max_tokens,
            "temperature": temperature or self.default_temperature,
            "messages": messages
        }
        
        if system_prompt:
            params["system"] = system_prompt
            
        return params
    
    def _format_code_review_prompt(self, code: str, context: str = "") -> str:
        """
        Format a prompt for code review
        
        Args:
            code: Code to review
            context: Additional context about the code
            
        Returns:
            Formatted prompt string
        """
        return f"""Please review this code with a focus on:
1. Code quality and best practices
2. Potential bugs or issues
3. Performance considerations
4. Security implications
5. Suggested improvements

Here's the code to review:
```
{code}
```

{context if context else ''}"""
    
    async def _handle_stream(self, stream_generator) -> AsyncGenerator[str, None]:
        """
        Process a streaming response from Claude
        
        Args:
            stream_generator: The stream generator from Claude API
            
        Yields:
            Text chunks from the response
        """
        buffer = ""
        try:
            async for chunk in stream_generator:
                if chunk.type == "content_block_delta" and chunk.delta.text:
                    buffer += chunk.delta.text
                    yield chunk.delta.text
        except Exception as e:
            logger.error(f"Streaming error: {str(e)}")
            if buffer:
                logger.info(f"Partial response before error: {buffer[:100]}...")
            raise AnthropicServiceError(f"Streaming failed: {str(e)}")
    
    async def review_code(
        self, 
        code: str, 
        context: str = "", 
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> AsyncGenerator[str, None]:
        """
        Review code and return a streaming response
        
        Args:
            code: The code to review
            context: Additional context about the code
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            
        Yields:
            Text chunks from the response
        
        Raises:
            HTTPException: On API or processing errors
        """
        try:
            prompt = self._format_code_review_prompt(code, context)
            
            params = self._create_message_params(
                prompt=prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            params["stream"] = True
            
            message = await self.client.messages.create(**params, timeout=self.request_timeout)
            
            async for text_chunk in self._handle_stream(message):
                yield text_chunk
                
        except AnthropicServiceError as e:
            logger.error(f"Code review error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error during code review: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in code review: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error during code review")

    async def generate_code(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None
    ) -> str:
        """
        Generate code with Claude (non-streaming)
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Temperature for generation
            
        Returns:
            Generated code as string
            
        Raises:
            HTTPException: On API or processing errors
        """
        try:
            params = self._create_message_params(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature
            )
            
            message = self.client.messages.create(**params, timeout=self.request_timeout)
            
            # Extract and return the text content
            if message.content and len(message.content) > 0:
                return message.content[0].text
            else:
                logger.warning("Empty response from Claude API")
                return ""
                
        except anthropic.APIError as e:
            logger.error(f"Anthropic API error: {str(e)}")
            raise HTTPException(status_code=502, detail=f"Anthropic API error: {str(e)}")
        except anthropic.RateLimitError as e:
            logger.error(f"Rate limit error: {str(e)}")
            raise HTTPException(status_code=429, detail="Rate limit exceeded, please try again later")
        except anthropic.APIConnectionError as e:
            logger.error(f"API connection error: {str(e)}")
            raise HTTPException(status_code=503, detail="Connection to Anthropic API failed")
        except Exception as e:
            logger.error(f"Unexpected error in code generation: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Unexpected error during code generation")
    
    async def close(self):
        """Close any open resources"""
        if hasattr(self, 'async_client'):
            await self.async_client.aclose() 