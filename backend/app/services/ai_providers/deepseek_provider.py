from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import AIProvider


class DeepSeekProvider(AIProvider):
    def __init__(self, api_key: str, model: str = "deepseek-chat"):
        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com",
        )
        self.model = model

    async def generate(self, system_prompt: str, messages: list[dict],
                       temperature: float = 0.7, max_tokens: int = 2000) -> str:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or ""

    async def generate_stream(self, system_prompt: str, messages: list[dict],
                               temperature: float = 0.7, max_tokens: int = 2000) -> AsyncIterator[str]:
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=full_messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    def count_tokens(self, text: str) -> int:
        return len(text) // 2
