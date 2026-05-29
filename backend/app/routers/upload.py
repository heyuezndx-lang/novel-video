import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File

router = APIRouter(prefix="/api", tags=["upload"])

UPLOAD_DIR = Path(__file__).parent.parent.parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    """上传角色形象参考图，返回访问URL"""
    ext = Path(file.filename).suffix or ".png"
    if ext.lower() not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        ext = ".png"

    name = f"{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / name
    content = await file.read()

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        return {"error": "图片不能超过10MB"}

    path.write_bytes(content)
    return {"url": f"/uploads/{name}", "filename": file.filename}
