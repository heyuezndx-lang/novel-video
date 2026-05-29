import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.ai_service import AIService
from ..schemas.ai_schema import (
    AIContinueRequest, AIPolishRequest, AIDialogueRequest,
    AISceneRequest, AISuggestRequest, AIResponse,
)

router = APIRouter(prefix="/ai", tags=["ai"])


async def _stream_response(generator, db: Session):
    """Wrap async generator into SSE format, close DB session when done."""
    try:
        async for chunk in generator:
            yield f"data: {json.dumps({'token': chunk}, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'event': 'done'})}\n\n"
    finally:
        db.close()


@router.post("/continue")
async def ai_continue(request: AIContinueRequest, db: Session = Depends(get_db)):
    service = AIService(db)
    result = await service.continue_writing(
        novel_id=request.novel_id,
        current_text=request.current_text,
        selected_text=request.selected_text,
        style_guide=request.style_guide,
        length=request.length,
        stream=request.stream,
    )
    if request.stream:
        return StreamingResponse(
            _stream_response(result, db),
            media_type="text/event-stream",
        )
    return AIResponse(generated_text=result)


@router.post("/polish")
async def ai_polish(request: AIPolishRequest, db: Session = Depends(get_db)):
    service = AIService(db)
    result = await service.polish(
        novel_id=request.novel_id,
        selected_text=request.selected_text,
        style_guide=request.style_guide,
        stream=request.stream,
    )
    if request.stream:
        return StreamingResponse(
            _stream_response(result, db),
            media_type="text/event-stream",
        )
    return AIResponse(generated_text=result)


@router.post("/dialogue")
async def ai_dialogue(request: AIDialogueRequest, db: Session = Depends(get_db)):
    service = AIService(db)
    result = await service.dialogue(
        novel_id=request.novel_id,
        character_name=request.character_name,
        context=request.context,
        style_guide=request.style_guide,
        stream=request.stream,
    )
    if request.stream:
        return StreamingResponse(
            _stream_response(result, db),
            media_type="text/event-stream",
        )
    return AIResponse(generated_text=result)


@router.post("/scene")
async def ai_scene(request: AISceneRequest, db: Session = Depends(get_db)):
    service = AIService(db)
    result = await service.scene(
        novel_id=request.novel_id,
        scene_context=request.scene_context,
        style_guide=request.style_guide,
        stream=request.stream,
    )
    if request.stream:
        return StreamingResponse(
            _stream_response(result, db),
            media_type="text/event-stream",
        )
    return AIResponse(generated_text=result)


@router.post("/suggest", response_model=AIResponse)
async def ai_suggest(request: AISuggestRequest, db: Session = Depends(get_db)):
    service = AIService(db)
    result = await service.suggest(
        novel_id=request.novel_id,
        context=request.context,
    )
    return AIResponse(generated_text=result)
