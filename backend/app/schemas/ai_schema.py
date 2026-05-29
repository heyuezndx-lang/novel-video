from pydantic import BaseModel, Field


class AIContinueRequest(BaseModel):
    novel_id: str
    chapter_id: str
    current_text: str = ""
    selected_text: str = ""
    style_guide: str = ""
    length: str = "paragraphs"
    stream: bool = True


class AIPolishRequest(BaseModel):
    novel_id: str
    chapter_id: str
    selected_text: str = Field(min_length=1)
    style_guide: str = ""
    stream: bool = True


class AIDialogueRequest(BaseModel):
    novel_id: str
    chapter_id: str
    character_name: str
    context: str = ""
    style_guide: str = ""
    stream: bool = True


class AISceneRequest(BaseModel):
    novel_id: str
    chapter_id: str
    scene_context: str = ""
    style_guide: str = ""
    stream: bool = True


class AISuggestRequest(BaseModel):
    novel_id: str
    chapter_id: str = ""
    context: str = ""


class AIResponse(BaseModel):
    generated_text: str
    usage: dict = {}
