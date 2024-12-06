from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # OCR服务配置
    PROJECT_NAME: str = "OCR Service"
    OCR_API_TOKEN: str = "your-secret-ocr-token"  # 这里设置固定的token
    USE_GPU: bool = False  # 添加GPU配置选项
    USE_DML: bool = False  # 添加DML配置选项
    
    # CORS配置
    CORS_ORIGINS: list[str] = ["http://localhost", "http://localhost:5174"]
    
    # 服务器配置
    OCR_SERVER_HOST: str = "0.0.0.0"  # 默认监听所有接口
    OCR_SERVER_PORT: int = 8001      # 默认端口
    OCR_NUM_WORKERS: int = 1  # 默认worker数量

    class Config:
        case_sensitive = True
        env_file = [
            "../../.env",                    # 本地开发环境
             ".env",                         # 根目录
        ]
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings() 