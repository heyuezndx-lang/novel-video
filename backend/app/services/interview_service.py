import json
from pathlib import Path
from sqlalchemy.orm import Session

from ..models import Story, InterviewSession, InterviewMessage, TimelineEvent, Person, MemoryFragment, Chapter
from ..config import settings
from .ai_providers.base import AIProvider
from .ai_providers.deepseek_provider import DeepSeekProvider

PROMPT_DIR = Path(__file__).parent.parent / "prompts" / "lifestory"

TOPICS = [
    ("childhood", "童年时光", "出生的地方、小时候的玩伴、最早的记忆"),
    ("family", "家庭岁月", "父母、兄弟姐妹、家族故事"),
    ("education", "求学之路", "上学、老师、同学、校园趣事"),
    ("career", "事业征程", "第一份工作、职业转折、成就与挫折"),
    ("love", "爱情故事", "初恋、婚姻、与爱人共度的时光"),
    ("parenting", "为人父母", "孩子出生、养育的点滴、为人父母的感悟"),
    ("travel", "旅途见闻", "去过的地方、旅途中的故事"),
    ("life_wisdom", "人生感悟", "生命中最大的收获、想对后人说的话"),
]


class InterviewService:

    def __init__(self, db: Session):
        self.db = db
        self.provider: AIProvider = DeepSeekProvider(
            api_key=settings.deepseek_api_key,
            model=settings.ai_default_model,
        )

    # ==================== Story ====================

    async def create_story(self, data: dict) -> Story:
        story = Story(**data)
        self.db.add(story)
        self.db.commit()
        self.db.refresh(story)
        return story

    # ==================== Session ====================

    async def start_session(self, story_id: str, topic: str = "") -> dict:
        story = self._get_story(story_id)

        if not topic:
            covered = story.interview_topics_covered or []
            for cat, name, _desc in TOPICS:
                if cat not in covered:
                    topic = cat
                    break

        session = InterviewSession(
            story_id=story_id,
            session_number=story.current_session + 1,
            topic=topic,
        )
        self.db.add(session)
        story.current_session = session.session_number
        self.db.commit()
        self.db.refresh(session)

        ai_msg = await self._generate_first_question(story, session)

        return {
            "session": session,
            "first_message": ai_msg,
            "available_topics": [
                {"key": c, "name": n, "desc": d, "done": c in (story.interview_topics_covered or [])}
                for c, n, d in TOPICS
            ],
        }

    async def process_answer(self, session_id: str, user_content: str) -> dict:
        session = self.db.get(InterviewSession, session_id)
        if not session:
            raise ValueError("会话不存在")

        story = self._get_story(session.story_id)

        user_msg = InterviewMessage(
            session_id=session_id,
            role="user",
            message_type="answer",
            content=user_content,
        )
        self.db.add(user_msg)
        session.message_count = (session.message_count or 0) + 1
        self.db.commit()

        recent_msgs = self._get_recent_messages(session_id, 10)
        existing_events = self._get_recent_events(session.story_id)

        system_prompt = self._load_prompt("interview_system.txt").format(
            interviewee_name=story.interviewee_name or "您",
            pronoun="您",
            birth_year=story.interviewee_birth_year or "未知",
            completed_topics="、".join(story.interview_topics_covered or []) or "无",
            current_topic=session.topic,
            session_number=str(session.session_number),
            existing_events=existing_events,
            recent_summary=self._build_summary(recent_msgs),
        )

        messages = [{"role": "user", "content": user_content}]

        response_text = await self.provider.generate(
            system_prompt=system_prompt,
            messages=messages,
            temperature=0.7,
            max_tokens=2000,
        )

        parsed = self._parse_ai_response(response_text)

        ai_msg = InterviewMessage(
            session_id=session_id,
            role="ai",
            message_type=parsed.get("type", "question"),
            content=parsed.get("content", response_text),
            emotion=parsed.get("emotion", ""),
            extracted_events=parsed.get("extracted_events", []),
            detected_persons=parsed.get("detected_persons", []),
        )
        self.db.add(ai_msg)
        session.message_count = (session.message_count or 0) + 1

        for event_data in parsed.get("extracted_events", []):
            event = TimelineEvent(
                story_id=session.story_id,
                title=event_data.get("title", ""),
                description=event_data.get("description", event_data.get("brief", "")),
                event_year=event_data.get("year"),
                category=event_data.get("category", "other"),
                importance=event_data.get("importance", 3),
                emotional_tone=event_data.get("emotional_tone", "neutral"),
                source_message_id=ai_msg.id,
            )
            self.db.add(event)

        for person_data in parsed.get("detected_persons", []):
            existing = self.db.query(Person).filter(
                Person.story_id == session.story_id,
                Person.name == person_data.get("name", ""),
            ).first()
            if not existing:
                person = Person(
                    story_id=session.story_id,
                    name=person_data.get("name", ""),
                    relationship=person_data.get("relationship", ""),
                    description=person_data.get("description", ""),
                )
                self.db.add(person)

        # Save memory fragment
        fragment = MemoryFragment(
            story_id=session.story_id,
            session_id=session_id,
            raw_answer=user_content,
            processed_content=parsed.get("content", ""),
            topic=session.topic,
            emotional_tone=parsed.get("emotion", "neutral"),
        )
        self.db.add(fragment)

        self.db.commit()
        self.db.refresh(ai_msg)

        return {
            "message": ai_msg,
            "extracted_events_count": len(parsed.get("extracted_events", [])),
            "detected_persons_count": len(parsed.get("detected_persons", [])),
        }

    async def end_session(self, session_id: str) -> dict:
        session = self.db.get(InterviewSession, session_id)
        if not session:
            raise ValueError("会话不存在")

        story = self._get_story(session.story_id)

        messages = self._get_recent_messages(session_id, session.message_count or 20)
        convo_text = "\n".join([f"{'小忆' if m.role == 'ai' else '我'}：{m.content[:200]}" for m in messages])

        summary_prompt = f"请为以下采访对话生成一段温暖的摘要（100字以内）：\n\n{convo_text}"
        summary = await self.provider.generate(
            system_prompt="你是一位人生故事记录者。",
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.5,
            max_tokens=200,
        )

        session.summary = summary.strip()
        session.status = "complete"
        session.completed_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc)

        # Mark topic as covered
        covered = story.interview_topics_covered or []
        if session.topic not in covered:
            covered.append(session.topic)
            story.interview_topics_covered = covered

        self.db.commit()
        self.db.refresh(session)

        return {"session": session, "summary": summary.strip()}

    # ==================== Chapter ====================

    async def generate_chapter(self, story_id: str, topic: str) -> Chapter:
        story = self._get_story(story_id)

        fragments = self.db.query(MemoryFragment).filter(
            MemoryFragment.story_id == story_id,
            MemoryFragment.topic == topic,
        ).all()

        if not fragments:
            raise ValueError("该话题下没有回忆素材")

        events = self.db.query(TimelineEvent).filter(
            TimelineEvent.story_id == story_id,
            TimelineEvent.category == topic,
        ).all()

        time_range = "未知"
        years = [e.event_year for e in events if e.event_year]
        if years:
            time_range = f"{min(years)}年 - {max(years)}年"

        frags_text = ""
        for i, f in enumerate(fragments, 1):
            frags_text += f"### 回忆 {i}\n{f.raw_answer}\n\n"

        system_prompt = self._load_prompt("chapter_composition.txt").format(
            interviewee_name=story.interviewee_name or "受访人",
            topic=topic or "人生故事",
            time_range=time_range,
            memory_fragments=frags_text,
        )

        chapter_text = await self.provider.generate(
            system_prompt="你是一位人生传记作家。",
            messages=[{"role": "user", "content": "请根据以上素材撰写章节。"}],
            temperature=0.6,
            max_tokens=4000,
        )

        topic_names = {c: n for c, n, _d in TOPICS}
        chapter_title = topic_names.get(topic, topic)

        max_order = self.db.query(Chapter).filter(
            Chapter.story_id == story_id,
        ).count()

        chapter = Chapter(
            story_id=story_id,
            title=chapter_title,
            content=chapter_text.strip(),
            word_count=len(chapter_text.replace(" ", "").replace("\n", "")),
            sort_order=max_order,
            source_type="auto",
            status="complete",
        )
        self.db.add(chapter)
        self.db.commit()
        self.db.refresh(chapter)

        return chapter

    async def regenerate_chapter(self, chapter_id: str, feedback: str) -> Chapter:
        chapter = self.db.get(Chapter, chapter_id)
        if not chapter:
            raise ValueError("章节不存在")

        story = self._get_story(chapter.story_id)

        fragments = self.db.query(MemoryFragment).filter(
            MemoryFragment.story_id == chapter.story_id,
            MemoryFragment.topic == chapter.title,
        ).all()

        frags_text = "\n\n".join([f.raw_answer for f in fragments])

        system_prompt = self._load_prompt("chapter_composition.txt").format(
            interviewee_name=story.interviewee_name or "受访人",
            topic=chapter.title,
            time_range="",
            memory_fragments=frags_text,
        )

        chapter_text = await self.provider.generate(
            system_prompt="你是一位人生传记作家。",
            messages=[{"role": "user", "content": f"请根据素材重写此章节。修改要求：{feedback}"}],
            temperature=0.6,
            max_tokens=4000,
        )

        chapter.content = chapter_text.strip()
        chapter.word_count = len(chapter_text.replace(" ", "").replace("\n", ""))
        chapter.source_type = "user_edited"
        self.db.commit()
        self.db.refresh(chapter)
        return chapter

    # ==================== Helpers ====================

    def _get_story(self, story_id: str) -> Story:
        story = self.db.get(Story, story_id)
        if not story:
            raise ValueError("故事不存在")
        return story

    def _load_prompt(self, name: str) -> str:
        path = PROMPT_DIR / name
        if path.exists():
            return path.read_text(encoding="utf-8")
        return ""

    def _get_recent_messages(self, session_id: str, limit: int = 10) -> list:
        return self.db.query(InterviewMessage).filter(
            InterviewMessage.session_id == session_id,
        ).order_by(InterviewMessage.created_at.desc()).limit(limit).all()[::-1]

    def _get_recent_events(self, story_id: str) -> str:
        events = self.db.query(TimelineEvent).filter(
            TimelineEvent.story_id == story_id,
        ).order_by(TimelineEvent.event_year).limit(20).all()
        if not events:
            return "暂无"
        return "\n".join([f"- {e.event_year or '?'}年：{e.title}" for e in events])

    def _build_summary(self, messages: list) -> str:
        if not messages:
            return "刚开始对话"
        summary = ""
        for m in messages[-6:]:
            role = "小忆" if m.role == "ai" else "我"
            summary += f"{role}：{m.content[:80]}...\n"
        return summary

    async def _generate_first_question(self, story: Story, session: InterviewSession) -> InterviewMessage:
        topic_names = {c: n for c, n, _d in TOPICS}
        topic_name = topic_names.get(session.topic, session.topic)

        system_prompt = self._load_prompt("interview_system.txt").format(
            interviewee_name=story.interviewee_name or "您",
            pronoun="您",
            birth_year=story.interviewee_birth_year or "未知",
            completed_topics="、".join(story.interview_topics_covered or []) or "无",
            current_topic=session.topic,
            session_number=str(session.session_number),
            existing_events="暂无",
            recent_summary="刚开始对话",
        )

        first_question = await self.provider.generate(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": f"请开始本次访谈，话题是「{topic_name}」。先做一个温暖的开场，然后提出第一个问题。"}],
            temperature=0.7,
            max_tokens=1000,
        )

        parsed = self._parse_ai_response(first_question)
        content = parsed.get("content", first_question)

        msg = InterviewMessage(
            session_id=session.id,
            role="ai",
            message_type=parsed.get("type", "question"),
            content=content,
            emotion=parsed.get("emotion", "warm"),
            extracted_events=parsed.get("extracted_events", []),
            detected_persons=parsed.get("detected_persons", []),
        )
        self.db.add(msg)
        session.message_count = 1
        self.db.commit()
        self.db.refresh(msg)
        return msg

    def _parse_ai_response(self, text: str) -> dict:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:] if lines[0].startswith("```") else lines)
        if text.endswith("```"):
            text = text[:-3]

        try:
            data = json.loads(text)
            return {
                "type": data.get("type", "question"),
                "emotion": data.get("emotion", "warm"),
                "content": data.get("content", ""),
                "follow_up_hint": data.get("follow_up_hint", ""),
                "extracted_events": data.get("extracted_events", []),
                "detected_persons": data.get("detected_persons", []),
            }
        except (json.JSONDecodeError, TypeError):
            return {
                "type": "question",
                "emotion": "warm",
                "content": text,
                "follow_up_hint": "",
                "extracted_events": [],
                "detected_persons": [],
            }
