from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # 基础配置
    API_PREFIX: str = "/timebox/api"
    PROJECT_NAME: str = "FastAPI Project"
    
    # 数据库配置
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "password"
    POSTGRES_DB: str = "app_db"
    
    # Session配置
    SECRET_KEY: str = "your-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS配置
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # 文件上传配置
    UPLOAD_DIR: str = "uploads/screenshots"  # 默认上传目录
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 最大上传大小（10MB）
    ALLOWED_EXTENSIONS: set = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
    
    # 默认用户配置
    DEFAULT_USERNAME: str = "admin"
    DEFAULT_PASSWORD: str = "defaultpassword"
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    class Config:
        case_sensitive = True
        env_file = "../../.env"

# 创建设置实例的缓存装饰器
@lru_cache()
def get_settings() -> Settings:
    return Settings()

# 导出设置实例
settings = get_settings() 