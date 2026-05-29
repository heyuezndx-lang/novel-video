from sqlalchemy.orm import Session

from ..models import Storyboard
from ..config import settings
from .ai_providers.base import AIProvider
from .ai_providers.claude_provider import ClaudeProvider
from .ai_providers.openai_provider import OpenAIProvider

STORYBOARD_PROMPT = """你是一位专业的分镜师。请将以下小说片段拆分为分镜脚本，返回 JSON 数组格式。

要求：
- 分镜数量：{shot_count} 个
- 每个分镜包含：scene_number（序号）、shot_type（景别：close_up/medium/wide/establishing）、visual_desc（画面描述，适合AI绘图/视频生成）、dialogue（台词或旁白，如无则为空字符串）、camera_motion（镜头运动：static/push_in/pull_out/pan/tilt）、transition（转场：cut/fade_in/fade_out/dissolve）、duration（建议时长秒数，2-8之间）

只返回 JSON 数组，不要任何额外文字。格式：
[
  {{
    "scene_number": 1,
    "shot_type": "medium",
    "visual_desc": "...",
    "dialogue": "...",
    "camera_motion": "static",
    "transition": "cut",
    "duration": 5.0
  }}
]

小说片段：
{text_snippet}"""


class StoryboardService:

    @classmethod
    def _get_provider(cls) -> AIProvider:
        if settings.ai_default_provider == "openai":
            return OpenAIProvider(api_key=settings.openai_api_key, model=settings.ai_default_model)
        return ClaudeProvider(api_key=settings.anthropic_api_key, model=settings.ai_default_model)

    @classmethod
    async def generate_storyboards(cls, db: Session, chapter_id: str,
                                    text_snippet: str, shot_count: int = 5) -> list[Storyboard]:
        import json
        provider = cls._get_provider()
        prompt = STORYBOARD_PROMPT.format(shot_count=shot_count, text_snippet=text_snippet)
        response = await provider.generate(
            system_prompt="你是一位专业分镜师，只返回JSON。",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=3000,
        )

        # Extract JSON from response
        text = response.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        try:
            shots = json.loads(text)
        except json.JSONDecodeError:
            shots = [{
                "scene_number": i + 1,
                "shot_type": "medium",
                "visual_desc": f"第{i+1}个镜头",
                "dialogue": "",
                "camera_motion": "static",
                "transition": "cut",
                "duration": 5.0,
            } for i in range(shot_count)]

        # Save to database
        storyboards = []
        for shot in shots:
            sb = Storyboard(
                chapter_id=chapter_id,
                scene_number=shot.get("scene_number", 1),
                shot_type=shot.get("shot_type", "medium"),
                duration=shot.get("duration", 5.0),
                visual_desc=shot.get("visual_desc", ""),
                dialogue=shot.get("dialogue", ""),
                camera_motion=shot.get("camera_motion", "static"),
                transition=shot.get("transition", "cut"),
                sort_order=shot.get("scene_number", 1),
            )
            db.add(sb)
            storyboards.append(sb)

        db.commit()
        for sb in storyboards:
            db.refresh(sb)
        return storyboards
