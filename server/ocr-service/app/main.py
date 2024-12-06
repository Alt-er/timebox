import logging
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from app.services.ocr_processor import OCRProcessor
import os
import tempfile
from app.core.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)

# 创建OCR处理器实例
ocr_processor = OCRProcessor()

# 创建主路由器
root_router = APIRouter()
app = FastAPI(title="OCR Service")

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@root_router.post("/ocr")
async def process_image(
    file: UploadFile = File(...),
    authorization: str = Header(None)
):
    """
    处理上传的图片文件并返回OCR结果
    """
    # 验证token
    if not authorization or authorization != f"Bearer {settings.OCR_API_TOKEN}":
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing token"
        )
        
    try:
        # 直接读取上传文件的内容
        content = await file.read()
        
        # 调用OCR处理,传入图片二进制数据
        result = await ocr_processor.process_image_async(content)
        return result

    except Exception as e:
        logging.error(f"OCR处理错误: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@root_router.get("/")
async def read_root():
    return {"message": "Welcome to OCR Service"}

# 将路由器添加到应用
app.include_router(root_router)

def dev():
    """开发环境启动函数"""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.OCR_SERVER_HOST,
        port=settings.OCR_SERVER_PORT,  # 使用配置中的端口
        reload=True,
        log_level="debug"
    )

def start():
    """生产环境启动函数"""
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.OCR_SERVER_HOST,
        port=settings.OCR_SERVER_PORT,  # 使用配置中的端口
        # workers=4,
        log_level="debug"
    )
