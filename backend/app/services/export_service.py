from sqlalchemy.orm import Session
from ..models import Novel, Chapter, Story


class ExportService:

    @staticmethod
    def export_markdown(db: Session, novel_id: str) -> str:
        novel = db.get(Novel, novel_id)
        chapters = db.query(Chapter).filter(
            Chapter.novel_id == novel_id, Chapter.parent_id.is_(None)
        ).order_by(Chapter.sort_order).all()

        parts = [f"# {novel.title}\n\n"]
        if novel.author:
            parts.append(f"> 作者：{novel.author}\n\n")
        parts.append("---\n\n")

        for ch in chapters:
            parts.append(f"## {ch.title}\n\n")
            parts.append(ch.content + "\n\n")

            # Include child scenes
            scenes = db.query(Chapter).filter(
                Chapter.novel_id == novel_id,
                Chapter.parent_id == ch.id,
            ).order_by(Chapter.sort_order).all()
            for scene in scenes:
                parts.append(f"### {scene.title}\n\n")
                parts.append(scene.content + "\n\n")

        return "".join(parts)

    @staticmethod
    def export_txt(db: Session, novel_id: str) -> str:
        novel = db.get(Novel, novel_id)
        chapters = db.query(Chapter).filter(
            Chapter.novel_id == novel_id, Chapter.parent_id.is_(None)
        ).order_by(Chapter.sort_order).all()

        parts = [f"{novel.title}\n"]
        if novel.author:
            parts.append(f"作者：{novel.author}\n")
        parts.append("=" * 40 + "\n\n")

        for ch in chapters:
            parts.append(f"\n{ch.title}\n")
            parts.append("-" * 20 + "\n")
            parts.append(ch.content + "\n")

            scenes = db.query(Chapter).filter(
                Chapter.novel_id == novel_id,
                Chapter.parent_id == ch.id,
            ).order_by(Chapter.sort_order).all()
            for scene in scenes:
                parts.append(f"\n  {scene.title}\n")
                parts.append(scene.content + "\n")

        return "".join(parts)

    @staticmethod
    def export_story_markdown(db: Session, story_id: str) -> str:
        story = db.get(Story, story_id)
        chapters = db.query(Chapter).filter(
            Chapter.story_id == story_id, Chapter.parent_id.is_(None)
        ).order_by(Chapter.sort_order).all()

        parts = [f"# {story.title}\n\n"]
        if story.interviewee_name:
            parts.append(f"> 口述：{story.interviewee_name}\n\n")
        if story.dedication:
            parts.append(f"> {story.dedication}\n\n")
        parts.append("---\n\n")

        if not chapters:
            parts.append("*还没有生成的章节*\n")
        else:
            for ch in chapters:
                parts.append(f"## {ch.title}\n\n")
                parts.append(ch.content + "\n\n")

        return "".join(parts)
