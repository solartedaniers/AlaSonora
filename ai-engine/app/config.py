from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (or .env) — never hardcoded, mirroring the backend's own zero-hardcoded-values rule."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    internal_api_key: str
    default_min_confidence: float = 0.1
    default_max_results: int = 3
    max_inference_workers: int = 2


settings = Settings()
