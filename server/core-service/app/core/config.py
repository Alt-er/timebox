from typing import Optional, List, Dict
from pydantic_settings import BaseSettings
from functools import lru_cache
from pydantic import BaseModel

class OCRServiceConfig(BaseModel):
    url: str
    token: str
    max_retries: int = 3
    timeout: int = 30  # 超时时间（秒）

class Settings(BaseSettings):
    # 基础配置
    API_PREFIX: str = "/timebox/api"
    PROJECT_NAME: str = "Core Service"
    
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
    
    # OCR服务配置
    OCR_SERVICE_URLS: str = "http://localhost:8001/ocr,http://localhost:8002/ocr"
    OCR_SERVICE_TOKENS: str = "token1,token2"
    OCR_SERVICE_MAX_RETRIES: int = 3
    OCR_SERVICE_TIMEOUT: int = 60
    
    # 并发控制
    OCR_CONCURRENT_LIMIT: int = 1  # 每个服务同时处理的图片数量限制
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def OCR_SERVICES(self) -> List[OCRServiceConfig]:
        urls = self.OCR_SERVICE_URLS.split(',')
        tokens = self.OCR_SERVICE_TOKENS.split(',')
        
        return [
            OCRServiceConfig(
                url=url.strip(),
                token=token.strip(),
                max_retries=self.OCR_SERVICE_MAX_RETRIES,
                timeout=self.OCR_SERVICE_TIMEOUT
            )
            for url, token in zip(urls, tokens)
        ]
    
    class Config:
        case_sensitive = True
        env_file = [
            "../../.env",                    # 本地开发环境
             ".env",                         # 根目录
            "/etc/timebox/.env",            # 生产环境
        ]
        extra = "allow"

# 创建设置实例的缓存装饰器
@lru_cache()
def get_settings() -> Settings:
    return Settings()

# 导出设置实例
settings = get_settings() 