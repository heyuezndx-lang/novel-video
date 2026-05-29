from abc import ABC, abstractmethod


class VideoProvider(ABC):
    """视频生成提供商抽象基类（预留接口）"""

    @abstractmethod
    async def generate(self, prompt: str, duration: float = 5.0) -> dict:
        """生成视频，返回 {"video_url": "...", "thumbnail_url": "...", "task_id": "..."} """
        ...

    @abstractmethod
    async def check_status(self, task_id: str) -> dict:
        """查询任务状态，返回 {"status": "pending/processing/done/failed", ...}"""
        ...
