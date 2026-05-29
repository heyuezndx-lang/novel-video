from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Novel, Character
from ..schemas.character import CharacterCreate, CharacterUpdate, CharacterOut

router = APIRouter(prefix="/novels/{novel_id}", tags=["characters"])


def _get_novel(novel_id: str, db: Session) -> Novel:
    novel = db.get(Novel, novel_id)
    if not novel:
        raise HTTPException(404, "小说不存在")
    return novel


@router.get("/characters", response_model=list[CharacterOut])
def list_characters(novel_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    return db.query(Character).filter(
        Character.novel_id == novel_id
    ).order_by(Character.sort_order).all()


@router.post("/characters", response_model=CharacterOut, status_code=201)
def create_character(novel_id: str, data: CharacterCreate, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    char = Character(novel_id=novel_id, **data.model_dump())
    db.add(char)
    db.commit()
    db.refresh(char)
    return char


@router.get("/characters/{char_id}", response_model=CharacterOut)
def get_character(novel_id: str, char_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    char = db.get(Character, char_id)
    if not char or char.novel_id != novel_id:
        raise HTTPException(404, "角色不存在")
    return char


@router.put("/characters/{char_id}", response_model=CharacterOut)
def update_character(novel_id: str, char_id: str, data: CharacterUpdate, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    char = db.get(Character, char_id)
    if not char or char.novel_id != novel_id:
        raise HTTPException(404, "角色不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(char, key, val)
    db.commit()
    db.refresh(char)
    return char


@router.delete("/characters/{char_id}", status_code=204)
def delete_character(novel_id: str, char_id: str, db: Session = Depends(get_db)):
    _get_novel(novel_id, db)
    char = db.get(Character, char_id)
    if not char or char.novel_id != novel_id:
        raise HTTPException(404, "角色不存在")
    db.delete(char)
    db.commit()
