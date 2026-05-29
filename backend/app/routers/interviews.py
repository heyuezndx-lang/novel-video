import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import InterviewSession, InterviewMessage
from ..schemas.interview import SessionStartRequest, SendMessageRequest, SessionOut, MessageOut, SessionWithMessages
from ..services.interview_service import InterviewService

router = APIRouter(prefix="/api/stories/{story_id}", tags=["interviews"])


@router.post("/sessions", response_model=dict)
async def start_session(story_id: str, data: SessionStartRequest, db: Session = Depends(get_db)):
    service = InterviewService(db)
    try:
        result = await service.start_session(story_id, data.topic)
        return {
            "session": SessionOut.model_validate(result["session"]).model_dump(),
            "first_message": MessageOut.model_validate(result["first_message"]).model_dump(),
            "available_topics": result["available_topics"],
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(story_id: str, db: Session = Depends(get_db)):
    return db.query(InterviewSession).filter(
        InterviewSession.story_id == story_id,
    ).order_by(InterviewSession.session_number).all()


@router.get("/sessions/{session_id}", response_model=SessionWithMessages)
def get_session(story_id: str, session_id: str, db: Session = Depends(get_db)):
    session = db.get(InterviewSession, session_id)
    if not session or session.story_id != story_id:
        raise HTTPException(404, "会话不存在")
    return session


@router.post("/sessions/{session_id}/message", response_model=MessageOut)
async def send_message(story_id: str, session_id: str, data: SendMessageRequest, db: Session = Depends(get_db)):
    service = InterviewService(db)
    try:
        result = await service.process_answer(session_id, data.content)
        return MessageOut.model_validate(result["message"])
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/end", response_model=dict)
async def end_session(story_id: str, session_id: str, db: Session = Depends(get_db)):
    service = InterviewService(db)
    try:
        result = await service.end_session(session_id)
        return {
            "session": SessionOut.model_validate(result["session"]).model_dump(),
            "summary": result["summary"],
        }
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/chapters/generate")
async def generate_chapter(story_id: str, db: Session = Depends(get_db)):
    service = InterviewService(db)
    try:
        session = db.query(InterviewSession).filter(
            InterviewSession.story_id == story_id,
            InterviewSession.status == "complete",
        ).order_by(InterviewSession.session_number.desc()).first()

        if not session:
            raise HTTPException(400, "请先完成至少一次采访会话")

        chapter = await service.generate_chapter(story_id, session.topic)
        return {"id": chapter.id, "title": chapter.title, "content": chapter.content,
                "word_count": chapter.word_count}
    except (ValueError, HTTPException) as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(400, str(e))
