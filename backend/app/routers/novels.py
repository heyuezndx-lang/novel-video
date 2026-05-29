from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Novel, Chapter
from ..schemas.novel import NovelCreate, NovelUpdate, NovelOut, NovelListItem

router = APIRouter(tags=["novels"])


@router.get("/novels", response_model=list[NovelListItem])
def list_novels(db: Session = Depends(get_db)):
    novels = db.query(Novel).order_by(Novel.updated_at.desc()).all()
    result = []
    for n in novels:
        chapter_count = db.query(func.count(Chapter.id)).filter(Chapter.novel_id == n.id).scalar()
        total_words = db.query(func.sum(Chapter.word_count)).filter(Chapter.novel_id == n.id).scalar() or 0
        result.append(NovelListItem(
            id=n.id, title=n.title, genre=n.genre, status=n.status,
            chapter_count=chapter_count, total_words=total_words, updated_at=n.updated_at,
        ))
    return result


@router.post("/novels", response_model=NovelOut, status_code=201)
def create_novel(data: NovelCreate, db: Session = Depends(get_db)):
    novel = Novel(**data.model_dump())
    db.add(novel)
    db.commit()
    db.refresh(novel)
    return novel


@router.get("/novels/{novel_id}", response_model=NovelOut)
def get_novel(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    return novel


@router.put("/novels/{novel_id}", response_model=NovelOut)
def update_novel(novel_id: str, data: NovelUpdate, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(novel, key, val)
    db.commit()
    db.refresh(novel)
    return novel


@router.delete("/novels/{novel_id}", status_code=204)
def delete_novel(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    db.delete(novel)
    db.commit()


@router.get("/novels/{novel_id}/stats")
def novel_stats(novel_id: str, db: Session = Depends(get_db)):
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    chapter_count = db.query(func.count(Chapter.id)).filter(Chapter.novel_id == novel_id).scalar()
    total_words = db.query(func.sum(Chapter.word_count)).filter(Chapter.novel_id == novel_id).scalar() or 0
    return {
        "novel_id": novel_id,
        "chapter_count": chapter_count,
        "total_words": total_words,
        "status": novel.status,
    }
