from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Novel Video API",
    description="小说→AI视频 写作助手",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
from .routers import novels, chapters, characters, storyboard, video, ai, export  # noqa: E402

app.include_router(novels.router, prefix="/api")
app.include_router(chapters.router, prefix="/api")
app.include_router(characters.router, prefix="/api")
app.include_router(storyboard.router, prefix="/api")
app.include_router(video.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(export.router, prefix="/api")
