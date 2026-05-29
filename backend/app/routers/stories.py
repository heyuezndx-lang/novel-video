from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Story, Chapter, InterviewSession
from ..schemas.story import StoryCreate, StoryUpdate, StoryOut, StoryListItem

router = APIRouter(prefix="/api", tags=["stories"])


@router.get("/stories", response_model=list[StoryListItem])
def list_stories(db: Session = Depends(get_db)):
    stories = db.query(Story).order_by(Story.updated_at.desc()).all()
    result = []
    for s in stories:
        chapter_count = db.query(func.count(Chapter.id)).filter(Chapter.story_id == s.id).scalar()
        session_count = db.query(func.count(InterviewSession.id)).filter(
            InterviewSession.story_id == s.id).scalar()
        result.append(StoryListItem(
            id=s.id, title=s.title, interviewee_name=s.interviewee_name,
            status=s.status, chapter_count=chapter_count, session_count=session_count,
            updated_at=s.updated_at,
        ))
    return result


@router.post("/stories", response_model=StoryOut, status_code=201)
def create_story(data: StoryCreate, db: Session = Depends(get_db)):
    story = Story(**data.model_dump())
    db.add(story)
    db.commit()
    db.refresh(story)
    return story


@router.get("/stories/{story_id}", response_model=StoryOut)
def get_story(story_id: str, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    return story


@router.put("/stories/{story_id}", response_model=StoryOut)
def update_story(story_id: str, data: StoryUpdate, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(story, key, val)
    db.commit()
    db.refresh(story)
    return story


@router.delete("/stories/{story_id}", status_code=204)
def delete_story(story_id: str, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    db.delete(story)
    db.commit()
