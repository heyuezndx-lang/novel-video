from typing import AsyncIterator
from anthropic import AsyncAnthropic
from .base import AIProvider


class ClaudeProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        self.client = AsyncAnthropic(api_key=api_key)
        self.model = model

    async def generate(self, system_prompt: str, messages: list[dict],
                       temperature: float = 0.7, max_tokens: int = 2000) -> str:
        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
        )
        return resp.content[0].text

    async def generate_stream(self, system_prompt: str, messages: list[dict],
                               temperature: float = 0.7, max_tokens: int = 2000) -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    def count_tokens(self, text: str) -> int:
        return len(text) // 3
