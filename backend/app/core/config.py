from pathlib import Path

from pydantic_settings import BaseSettings

BACKEND_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema Multimarca"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "multimarca_secret_key_jwt_default_dev"
    ALGORITHM: str = "HS256"
    # PostgreSQL URL from Supabase.
    DATABASE_URL: str = "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
    SUPABASE_URL: str = ""
    SUPABASE_SECRET_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_PRODUCT_IMAGES_BUCKET: str = "product-images"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = BACKEND_DIR / ".env"
        extra = "ignore"
        case_sensitive = True

settings = Settings()
