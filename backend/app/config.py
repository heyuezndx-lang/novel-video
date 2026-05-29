from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///../data/novels.db"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ai_default_provider: str = "claude"
    ai_default_model: str = "claude-sonnet-4-6"
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5500"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
