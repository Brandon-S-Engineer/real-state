from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    openai_api_key: str
    # Solo modelos baratos: el demo es público.
    model: str = "gpt-4.1-mini"
    allowed_origins: str = "https://brandon-s-engineer.com,http://localhost:3000"
    runs_per_hour: int = 20


settings = Settings()  # type: ignore[call-arg]
