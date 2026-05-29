import json
import base64
import hashlib
import time

APPID = "f6099921"
API_KEY = "Y2UxYjgwNTJhNzc1OThiNzY1YTJiNmRi"
API_SECRET = "079795a394a3a63f9a92fe1c979981a0"


class XunfeiService:
    """讯飞语音服务 — 语音听写(ASR) + 语音合成(TTS)"""

    @classmethod
    def _asr_headers(cls) -> dict:
        cur_time = str(int(time.time()))
        param = base64.b64encode(json.dumps({
            "engine_type": "sms16k",
            "aue": "raw",
        }).encode()).decode()
        checksum = hashlib.md5(f"{API_KEY}{cur_time}{param}".encode()).hexdigest()
        return {
            "X-Appid": APPID,
            "X-CurTime": cur_time,
            "X-Param": param,
            "X-CheckSum": checksum,
        }

    @classmethod
    def _tts_headers(cls) -> dict:
        cur_time = str(int(time.time()))
        param = base64.b64encode(json.dumps({
            "auf": "audio/L16;rate=16000",
            "aue": "lame",
            "voice_name": "xiaoyan",
            "speed": "50",
            "volume": "50",
            "pitch": "50",
            "engine_type": "intp65",
            "text_type": "text",
        }).encode()).decode()
        checksum = hashlib.md5(f"{API_KEY}{cur_time}{param}".encode()).hexdigest()
        return {
            "X-Appid": APPID,
            "X-CurTime": cur_time,
            "X-Param": param,
            "X-CheckSum": checksum,
        }

    @classmethod
    async def recognize(cls, audio_bytes: bytes) -> str:
        """语音听写"""
        import httpx

        if len(audio_bytes) < 400:
            raise Exception("音频太短，请录制至少1秒")

        headers = cls._asr_headers()
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"

        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.xfyun.cn/v1/service/v1/iat",
                headers=headers,
                content=audio_bytes,
            )
            result = resp.json()
            code = result.get("code", "")
            if code != "0":
                raise Exception(f"识别失败: {result.get('desc','')} (code={code})")
            return result.get("data", "")

    @classmethod
    async def synthesize(cls, text: str) -> bytes:
        """语音合成"""
        import httpx

        text = text[:500]
        headers = cls._tts_headers()
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.xfyun.cn/v1/service/v1/tts",
                headers=headers,
                data={"text": text},
            )
            if resp.status_code != 200:
                raise Exception(f"TTS HTTP {resp.status_code}")

            content_type = resp.headers.get("content-type", "")
            if "audio" in content_type:
                return resp.content

            result = resp.json()
            code = result.get("code", "")
            if code != "0":
                raise Exception(f"合成失败: {result.get('desc','')} (code={code})")
            return resp.content
