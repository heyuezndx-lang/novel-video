from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Novel, Chapter, ChapterHistory
from ..schemas.chapter import (
    ChapterCreate, ChapterUpdate, ChapterMove,
    ChapterOut, ChapterListItem, HistoryOut, HistoryCreate,
)

router = APIRouter(prefix="/novels/{novel_id}", tags=["chapters"])


def _get_novel(novel_id: str, db: Session) -> Novel:
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    return novel


def _build_chapter_tree(chapters: list[Chapter]) -> list[ChapterListItem]:
    items = {c.id: ChapterListItem.model_validate(c) for c in chapters}
    roots = []
    for c in chapters:
        item = items[c.id]
        if c.parent_id and c.parent_id in items:
            items[c.parent_id].children.append(item)
        else:
            roots.append(item)
    return roots


@router.get("/chapters", response_model=list[ChapterListItem])
def list_chapters(novel_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapters = db.query(Chapter).filter(
        Chapter.novel_id == novel_id
    ).order_by(Chapter.sort_order).all()
    return _build_chapter_tree(chapters)


@router.post("/chapters", response_model=ChapterOut, status_code=201)
def create_chapter(novel_id: str, data: ChapterCreate, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    max_order = db.query(Chapter).filter(
        Chapter.novel_id == novel_id, Chapter.parent_id == data.parent_id
    ).count()
    chapter = Chapter(
        novel_id=novel_id,
        sort_order=data.sort_order or max_order,
        **data.model_dump(exclude={"sort_order"}),
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.get("/chapters/{chapter_id}", response_model=ChapterOut)
def get_chapter(novel_id: str, chapter_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    return chapter


@router.put("/chapters/{chapter_id}", response_model=ChapterOut)
def update_chapter(novel_id: str, chapter_id: str, data: ChapterUpdate, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(chapter, key, val)
    if data.content is not None:
        chapter.word_count = len(data.content.replace(" ", "").replace("\n", ""))
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=204)
def delete_chapter(novel_id: str, chapter_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    db.delete(chapter)
    db.commit()


@router.put("/chapters/{chapter_id}/move", response_model=ChapterOut)
def move_chapter(novel_id: str, chapter_id: str, data: ChapterMove, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    chapter.sort_order = data.new_sort_order
    if data.new_parent_id is not None:
        chapter.parent_id = data.new_parent_id
    db.commit()
    db.refresh(chapter)
    return chapter


# Version history
@router.get("/chapters/{chapter_id}/history", response_model=list[HistoryOut])
def list_history(novel_id: str, chapter_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    return db.query(ChapterHistory).filter(
        ChapterHistory.chapter_id == chapter_id
    ).order_by(ChapterHistory.version_number.desc()).all()


@router.post("/chapters/{chapter_id}/history", response_model=HistoryOut, status_code=201)
def create_snapshot(novel_id: str, chapter_id: str, data: HistoryCreate, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    max_ver = db.query(ChapterHistory).filter(
        ChapterHistory.chapter_id == chapter_id
    ).count()
    snap = ChapterHistory(
        chapter_id=chapter_id,
        version_number=max_ver + 1,
        content=chapter.content,
        word_count=chapter.word_count,
        message=data.message,
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


@router.post("/chapters/{chapter_id}/history/{version_id}/restore", response_model=ChapterOut)
def restore_snapshot(novel_id: str, chapter_id: str, version_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    chapter = db.get(Chapter, chapter_id)
    if not chapter or chapter.novel_id != novel_id:
        raise HTTPException(404, "章节不存在")
    snap = db.get(ChapterHistory, version_id)
    if not snap or snap.chapter_id != chapter_id:
        raise HTTPException(404, "版本不存在")
    chapter.content = snap.content
    chapter.word_count = snap.word_count
    db.commit()
    db.refresh(chapter)
    return chapter
