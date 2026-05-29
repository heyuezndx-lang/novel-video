import tempfile
import subprocess
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from ..services.xunfei_service import XunfeiService

router = APIRouter(prefix="/api/voice", tags=["voice"])

DATA_DIR = Path(__file__).parent.parent.parent.parent / "data"


@router.post("/recognize")
async def recognize(request: Request):
    """语音识别：接收前端录音（webm/opus），转为PCM后发送讯飞ASR"""
    tmp_in = None
    try:
        audio_bytes = await request.body()
        if len(audio_bytes) < 400:
            raise HTTPException(400, "音频太短，请录制至少1秒")

        # Save incoming audio
        tmp_in = DATA_DIR / "voice_in.webm"
        tmp_in.write_bytes(audio_bytes)

        # Convert webm to PCM using ffmpeg; if it fails, try raw PCM directly
        try:
            tmp_out = DATA_DIR / "voice_out.wav"
            subprocess.run([
                "ffmpeg", "-y", "-i", str(tmp_in),
                "-ar", "16000", "-ac", "1", "-sample_fmt", "s16",
                "-f", "wav", str(tmp_out)
            ], check=True, capture_output=True, timeout=10)
            pcm = tmp_out.read_bytes()[44:]  # Skip WAV header
            if tmp_out.exists(): tmp_out.unlink()
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
            # Not a valid webm — assume it's already raw PCM
            pcm = audio_bytes

        text = await XunfeiService.recognize(pcm)
        return {"text": text or ""}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"语音识别失败: {str(e)}")
    finally:
        if tmp_in and tmp_in.exists():
            try: tmp_in.unlink()
            except: pass


@router.post("/speak")
async def speak(request: Request):
    """语音合成：接收文本，返回MP3音频"""
    try:
        body = await request.json()
        text = body.get("text", "")
        if not text:
            raise HTTPException(400, "文本不能为空")
        text = text[:500]  # 限制长度，避免太长
        audio = await XunfeiService.synthesize(text)
        return Response(content=audio, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"语音合成失败: {str(e)}")
