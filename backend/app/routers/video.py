from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Storyboard, VideoTask
from ..schemas.video_schema import VideoTaskCreate, VideoTaskOut, VideoGenerateRequest

router = APIRouter(tags=["video"])


@router.post("/video/generate", response_model=list[VideoTaskOut])
async def generate_video(request: VideoGenerateRequest, db: Session = Depends(get_db)):
    """生成视频任务（当前为预留接口，返回模拟结果）"""
    tasks = []
    for sb_id in request.storyboard_ids:
        sb = db.get(Storyboard, sb_id)
        if not sb:
            raise HTTPException(404, f"分镜 {sb_id} 不存在")
        task = VideoTask(
            storyboard_id=sb_id,
            provider=request.provider,
            status="pending",
            prompt_sent=f"[预留] 视频生成 prompt: {sb.visual_desc[:200]}",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        tasks.append(task)
    return tasks


@router.get("/video/tasks/{task_id}", response_model=VideoTaskOut)
def get_video_task(task_id: str, db: Session = Depends(get_db)):
    task = db.get(VideoTask, task_id)
    if not task:
        raise HTTPException(404, "视频任务不存在")
    return task


@router.get("/storyboards/{sb_id}/videos", response_model=list[VideoTaskOut])
def list_storyboard_videos(sb_id: str, db: Session = Depends(get_db)):
    sb = db.get(Storyboard, sb_id)
    if not sb:
        raise HTTPException(404, "分镜不存在")
    return db.query(VideoTask).filter(
        VideoTask.storyboard_id == sb_id
    ).order_by(VideoTask.created_at.desc()).all()
