from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sistema Multimarca"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "multimarca_secret_key_jwt_default_dev"
    ALGORITHM: str = "HS256"
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/room_concept_store?charset=utf8mb4"

    class Config:
        env_file = ".env"
        extra = "ignore"
        case_sensitive = True

settings = Settings()
