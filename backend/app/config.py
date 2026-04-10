from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    POSTGRES_USER: str = "taskflow"
    POSTGRES_PASSWORD: str = "taskflow_secret"
    POSTGRES_DB: str = "taskflow"
    DATABASE_URL: str = "postgresql://taskflow:taskflow_secret@db:5432/taskflow"
    JWT_SECRET: str = "change-me-in-production"
    JWT_EXPIRY_HOURS: int = 24
    BCRYPT_COST: int = 12

    @property
    def async_database_url(self) -> str:
        return self.DATABASE_URL.replace(
            "postgresql://", "postgresql+asyncpg://", 1
        )

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
