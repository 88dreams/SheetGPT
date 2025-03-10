from typing import AsyncGenerator, Dict, Any
import anthropic
from fastapi import HTTPException
from src.core.config import settings

class AnthropicService:
    def __init__(self):
        self.client = anthropic.Client(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-3-7-sonnet-20250219"  # Latest Claude 3.7 Sonnet model

    async def review_code(self, code: str, context: str = "") -> AsyncGenerator[str, None]:
        try:
            prompt = f"""Please review this code with a focus on:
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

            message = await self.client.messages.create(
                model=self.model,
                max_tokens=15000,  # Increased limit to handle large code reviews
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                stream=True
            )
            
            async for chunk in message:
                if chunk.type == "content_block_delta" and chunk.delta.text:
                    yield chunk.delta.text
                    
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error reviewing code with Claude: {str(e)}"
            )

    async def generate_code(self, prompt: str) -> AsyncGenerator[str, None]:
        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=15000,  # Increased limit to handle larger code generation
                temperature=0.7,
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                stream=True
            )
            
            async for chunk in message:
                if chunk.type == "content_block_delta" and chunk.delta.text:
                    yield chunk.delta.text
                    
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error generating code with Claude: {str(e)}"
            ) 