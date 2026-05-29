from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Novel, Chapter
from ..services.export_service import ExportService

router = APIRouter(tags=["export"])


@router.get("/novels/{novel_id}/export/markdown")
def export_markdown(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    content = ExportService.export_markdown(db, novel_id)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={novel.title}.md"},
    )


@router.get("/novels/{novel_id}/export/txt")
def export_txt(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    content = ExportService.export_txt(db, novel_id)
    return PlainTextResponse(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={novel.title}.txt"},
    )
