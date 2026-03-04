from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_url: str = "sqlite:///./data/pairman.db"
    secret_key: str = "change-me-in-production"
    port: int = 8000
    data_dir: Path = Path("./data")

    model_config = {"env_prefix": "PAIRMAN_"}


settings = Settings()
