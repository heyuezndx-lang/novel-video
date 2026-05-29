from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Novel, Chapter, Story
from ..services.export_service import ExportService

router = APIRouter(tags=["export"])


def _make_export_response(content: str, filename: str, media_type: str) -> PlainTextResponse:
    encoded = quote(filename)
    return PlainTextResponse(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded}",
        },
    )


@router.get("/novels/{novel_id}/export/markdown")
def export_markdown(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    content = ExportService.export_markdown(db, novel_id)
    return _make_export_response(content, novel.title + ".md", "text/markdown; charset=utf-8")


@router.get("/novels/{novel_id}/export/txt")
def export_txt(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    content = ExportService.export_txt(db, novel_id)
    return _make_export_response(content, novel.title + ".txt", "text/plain; charset=utf-8")


@router.get("/stories/{story_id}/export/markdown")
def export_story_markdown(story_id: str, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    content = ExportService.export_story_markdown(db, story_id)
    return _make_export_response(content, story.title + ".md", "text/markdown; charset=utf-8")
