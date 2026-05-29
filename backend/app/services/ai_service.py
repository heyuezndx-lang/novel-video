from pathlib import Path
from sqlalchemy.orm import Session

from ..models import Novel, Chapter, Character
from ..config import settings
from .ai_providers.base import AIProvider
from .ai_providers.claude_provider import ClaudeProvider
from .ai_providers.openai_provider import OpenAIProvider
from .ai_providers.deepseek_provider import DeepSeekProvider

PROMPT_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt(name: str) -> str:
    path = PROMPT_DIR / name
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


class AIService:

    def __init__(self, db: Session):
        self.db = db
        self.provider = self._get_provider()

    def _get_provider(self) -> AIProvider:
        if settings.ai_default_provider == "openai":
            return OpenAIProvider(
                api_key=settings.openai_api_key,
                model=settings.ai_default_model,
            )
        elif settings.ai_default_provider == "deepseek":
            return DeepSeekProvider(
                api_key=settings.deepseek_api_key,
                model=settings.ai_default_model,
            )
        return ClaudeProvider(
            api_key=settings.anthropic_api_key,
            model=settings.ai_default_model,
        )

    def _gather_context(self, novel_id: str) -> dict:
        novel = self.db.get(Novel, novel_id)
        characters = self.db.query(Character).filter(
            Character.novel_id == novel_id
        ).order_by(Character.sort_order).all()

        chars_text = ""
        for c in characters:
            chars_text += f"- {c.name}（{c.role}）：{c.personality[:80]}\n"

        return {
            "novel_title": novel.title if novel else "",
            "genre": novel.genre if novel else "",
            "characters": chars_text,
        }

    async def continue_writing(self, novel_id: str, current_text: str,
                                selected_text: str = "", style_guide: str = "",
                                length: str = "paragraphs", stream: bool = True):
        ctx = self._gather_context(novel_id)
        system_prompt = _load_prompt("continue.txt").format(**ctx)

        messages = []
        if current_text:
            messages.append({"role": "user", "content": f"当前正文：\n\n{current_text[-3000:]}"})
        if selected_text:
            messages.append({"role": "user", "content": f"从这段继续写：\n\n{selected_text}"})
        if not current_text and not selected_text:
            messages.append({"role": "user", "content": "请开始写这一章。"})

        if style_guide:
            messages.append({"role": "user", "content": f"风格要求：{style_guide}"})

        max_tokens = {"sentences": 500, "paragraphs": 2000, "page": 4000}.get(length, 2000)

        if stream:
            return self.provider.generate_stream(system_prompt, messages, max_tokens=max_tokens)
        else:
            text = await self.provider.generate(system_prompt, messages, max_tokens=max_tokens)
            return text

    async def polish(self, novel_id: str, selected_text: str,
                     style_guide: str = "", stream: bool = True):
        ctx = self._gather_context(novel_id)
        system_prompt = _load_prompt("polish.txt").format(**ctx)

        messages = [{"role": "user", "content": f"请润色以下文字：\n\n{selected_text}"}]
        if style_guide:
            messages.append({"role": "user", "content": f"风格要求：{style_guide}"})

        if stream:
            return self.provider.generate_stream(system_prompt, messages, max_tokens=3000)
        else:
            return await self.provider.generate(system_prompt, messages, max_tokens=3000)

    async def dialogue(self, novel_id: str, character_name: str,
                       context: str = "", style_guide: str = "", stream: bool = True):
        ctx = self._gather_context(novel_id)
        system_prompt = _load_prompt("dialogue.txt").format(
            character_name=character_name, **ctx
        )

        messages = []
        if context:
            messages.append({"role": "user", "content": f"场景上下文：\n\n{context}"})
        messages.append({"role": "user", "content": f"请为 {character_name} 生成对话。"})

        if stream:
            return self.provider.generate_stream(system_prompt, messages, max_tokens=2000)
        else:
            return await self.provider.generate(system_prompt, messages, max_tokens=2000)

    async def scene(self, novel_id: str, scene_context: str = "",
                    style_guide: str = "", stream: bool = True):
        ctx = self._gather_context(novel_id)
        system_prompt = _load_prompt("scene.txt").format(**ctx)

        messages = [{"role": "user", "content": f"请描写以下场景：\n\n{scene_context or '请根据故事氛围进行环境描写'}"}]
        if style_guide:
            messages.append({"role": "user", "content": f"风格要求：{style_guide}"})

        if stream:
            return self.provider.generate_stream(system_prompt, messages, max_tokens=1500)
        else:
            return await self.provider.generate(system_prompt, messages, max_tokens=1500)

    async def suggest(self, novel_id: str, context: str = "") -> str:
        ctx = self._gather_context(novel_id)
        system_prompt = _load_prompt("suggest.txt").format(**ctx)

        messages = [{"role": "user", "content": context or "请根据当前故事进展，提供一些情节发展建议。"}]
        return await self.provider.generate(system_prompt, messages, max_tokens=1500)
