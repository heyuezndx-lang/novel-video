from abc import ABC, abstractmethod
from typing import AsyncIterator


class AIProvider(ABC):

    @abstractmethod
    async def generate(self, system_prompt: str, messages: list[dict],
                       temperature: float = 0.7, max_tokens: int = 2000) -> str:
        ...

    @abstractmethod
    async def generate_stream(self, system_prompt: str, messages: list[dict],
                               temperature: float = 0.7, max_tokens: int = 2000) -> AsyncIterator[str]:
        ...

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        ...
