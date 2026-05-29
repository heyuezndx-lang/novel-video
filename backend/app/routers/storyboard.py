from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Novel, Chapter, Storyboard
from ..schemas.storyboard_schema import (
    StoryboardCreate, StoryboardUpdate, StoryboardOut, StoryboardGenerateRequest,
)

router = APIRouter(prefix="/novels/{novel_id}/chapters/{chapter_id}", tags=["storyboard"])


def _get_chapter(novel_id: str, chapter_id: str, db: Session) -> Chapter:
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    return chapter


@router.get("/storyboards", response_model=list[StoryboardOut])
def list_storyboards(novel_id: str, chapter_id: str, db: Session = Depends(get_db)):
    _get_chapter(novel_id, chapter_id, db)
    return db.query(Storyboard).filter(
        Storyboard.chapter_id == chapter_id
    ).order_by(Storyboard.sort_order).all()


@router.post("/storyboards", response_model=StoryboardOut, status_code=201)
def create_storyboard(novel_id: str, chapter_id: str, data: StoryboardCreate, db: Session = Depends(get_db)):
    _get_chapter(novel_id, chapter_id, db)
    sb = Storyboard(chapter_id=chapter_id, **data.model_dump())
    db.add(sb)
    db.commit()
    db.refresh(sb)
    return sb


@router.put("/storyboards/{sb_id}", response_model=StoryboardOut)
def update_storyboard(novel_id: str, chapter_id: str, sb_id: str,
                       data: StoryboardUpdate, db: Session = Depends(get_db)):
    _get_chapter(novel_id, chapter_id, db)
    sb = db.get(Storyboard, sb_id)
    if not sb or sb.chapter_id != chapter_id:
        raise HTTPException(404, "分镜不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(sb, key, val)
    db.commit()
    db.refresh(sb)
    return sb


@router.delete("/storyboards/{sb_id}", status_code=204)
def delete_storyboard(novel_id: str, chapter_id: str, sb_id: str, db: Session = Depends(get_db)):
    _get_chapter(novel_id, chapter_id, db)
    sb = db.get(Storyboard, sb_id)
    if not sb or sb.chapter_id != chapter_id:
        raise HTTPException(404, "分镜不存在")
    db.delete(sb)
    db.commit()


@router.post("/storyboards/generate", response_model=list[StoryboardOut])
async def generate_storyboards(novel_id: str, chapter_id: str,
                                request: StoryboardGenerateRequest,
                                db: Session = Depends(get_db)):
    """AI 拆分分镜"""
    chapter = _get_chapter(novel_id, chapter_id, db)
    from ..services.storyboard_service import StoryboardService
    storyboards = await StoryboardService.generate_storyboards(
        db=db,
        chapter_id=chapter_id,
        text_snippet=request.text_snippet,
        shot_count=request.shot_count,
    )
    return storyboards
