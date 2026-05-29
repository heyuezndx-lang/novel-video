from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Story, TimelineEvent
from ..schemas.timeline import TimelineEventCreate, TimelineEventUpdate, TimelineEventOut

router = APIRouter(prefix="/api/stories/{story_id}", tags=["events"])


@router.get("/events", response_model=list[TimelineEventOut])
def list_events(story_id: str, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    return db.query(TimelineEvent).filter(
        TimelineEvent.story_id == story_id,
    ).order_by(TimelineEvent.event_year).all()


@router.post("/events", response_model=TimelineEventOut, status_code=201)
def create_event(story_id: str, data: TimelineEventCreate, db: Session = Depends(get_db)):
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(404, "故事不存在")
    event = TimelineEvent(story_id=story_id, **data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.put("/events/{event_id}", response_model=TimelineEventOut)
def update_event(story_id: str, event_id: str, data: TimelineEventUpdate, db: Session = Depends(get_db)):
    event = db.get(TimelineEvent, event_id)
    if not event or event.story_id != story_id:
        raise HTTPException(404, "事件不存在")
    for key, val in data.model_dump(exclude_unset=True).items():
        setattr(event, key, val)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=204)
def delete_event(story_id: str, event_id: str, db: Session = Depends(get_db)):
    event = db.get(TimelineEvent, event_id)
    if not event or event.story_id != story_id:
        raise HTTPException(404, "事件不存在")
    db.delete(event)
    db.commit()
