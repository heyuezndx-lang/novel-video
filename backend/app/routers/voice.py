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
    tmp_pcm = None
    try:
        audio_bytes = await request.body()
        if len(audio_bytes) < 400:
            raise HTTPException(400, "音频太短，请录制至少1秒")

        # Save for debug
        tmp_in = DATA_DIR / "debug_voice.webm"
        tmp_in.write_bytes(audio_bytes)

        # Try ffmpeg conversion to PCM
        pcm = None
        convert_ok = False
        try:
            tmp_pcm = DATA_DIR / "debug_voice.pcm"
            subprocess.run([
                "ffmpeg", "-y", "-i", str(tmp_in),
                "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                "-f", "s16le", str(tmp_pcm)
            ], check=True, capture_output=True, timeout=15)
            pcm = tmp_pcm.read_bytes()
            convert_ok = len(pcm) > 400
        except Exception:
            pass

        # Try PCM first, then raw webm as fallback
        errors = []
        if convert_ok:
            try:
                text = await XunfeiService.recognize(pcm)
                if text:
                    return {"text": text}
            except Exception as e:
                errors.append(f"PCM: {e}")

        # Fallback: try raw webm directly
        try:
            text = await XunfeiService.recognize(audio_bytes)
            if text:
                return {"text": text}
        except Exception as e:
            errors.append(f"WebM: {e}")

        raise HTTPException(500, "; ".join(errors) if errors else "无法识别语音")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"语音识别失败: {str(e)}")


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
