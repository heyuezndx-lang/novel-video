from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db

FRONTEND_DIR = Path(__file__).parent.parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="人生故事 API",
    description="人生故事写作助手 — AI 采访式传记写作",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers - 人生故事
from .routers import stories, interviews, events, persons  # noqa: E402
from .routers import novels, chapters, characters, storyboard, video, ai, export, upload  # noqa: E402

app.include_router(stories.router)
app.include_router(interviews.router)
app.include_router(events.router)
app.include_router(persons.router)
app.include_router(upload.router)

# Legacy routes (保留兼容)
app.include_router(novels.router, prefix="/api")
app.include_router(chapters.router, prefix="/api")
app.include_router(characters.router, prefix="/api")
app.include_router(storyboard.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(export.router, prefix="/api")

# Mount uploads
UPLOAD_DIR = Path(__file__).parent.parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Mount frontend static files
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
