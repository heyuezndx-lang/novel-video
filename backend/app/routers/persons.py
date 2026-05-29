from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Story, Person
from ..schemas.person import PersonCreate, PersonUpdate, PersonOut

router = APIRouter(prefix="/api/stories/{story_id}", tags=["persons"])


@router.get("/persons", response_model=list[PersonOut])
def list_persons(story_id: str, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    return db.query(Person).filter(
        Person.story_id == story_id,
    ).order_by(Person.name).all()


@router.post("/persons", response_model=PersonOut, status_code=201)
def create_person(story_id: str, data: PersonCreate, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    person = Person(story_id=story_id, **data.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.put("/persons/{person_id}", response_model=PersonOut)
def update_person(story_id: str, person_id: str, data: PersonUpdate, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person or person.story_id != story_id:
        raise HTTPException(404, "人物不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(person, key, val)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/persons/{person_id}", status_code=204)
def delete_person(story_id: str, person_id: str, db: Session = Depends(get_db)):
    person = db.get(Person, person_id)
    if not person or person.story_id != story_id:
        raise HTTPException(404, "人物不存在")
    db.delete(person)
    db.commit()
