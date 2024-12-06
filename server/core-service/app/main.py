# app/main.py

import logging
from fastapi import FastAPI, APIRouter, Request, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from app.api.items import router as items_router
from app.api.image import router as image_router
from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.auth import get_current_user
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base, SessionLocal
from app.models.user import User
from app.core.auth import get_password_hash
import os
from app.services.scheduler import OCRScheduler
import uvicorn

ocr_scheduler = OCRScheduler()

# 配置日志
logging.basicConfig(
    level=logging.INFO,  # 设置日志级别为INFO
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # 日志格式
    handlers=[
        logging.StreamHandler()  # 将日志输出到控制台
    ]
)


# 创建主路由器
root_router = APIRouter(prefix=settings.API_PREFIX)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# 添加SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加 API 路由
root_router.include_router(items_router, prefix="/items", tags=["items"])
root_router.include_router(image_router, prefix="/image", tags=["image"], dependencies=[Depends(get_current_user)])
root_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# 将主路由器添加到 app
app.include_router(root_router)

# 挂载静态文件目录
app.mount("/timebox", StaticFiles(directory="static", html=True), name="static")


# 根路由也添加到主路由器
@root_router.get("/")
async def read_root():
    return {"message": "Welcome to the API"}

# 在应用启动时创建所有表并添加默认用户
@app.on_event("startup")
async def startup_event():
    # 创建所有表
    Base.metadata.create_all(bind=engine)

    # 创建数据库会话
    db = SessionLocal()
    try:
        # 检查用户表是否为空
        user_count = db.query(User).count()
        if user_count == 0:
            # 如果用户表为空，创建默认用户
            default_user = User(
                username=settings.DEFAULT_USERNAME,
                hashed_password=get_password_hash(settings.DEFAULT_PASSWORD)  # 使用配置中的默认密码
            )
            db.add(default_user)
            db.commit()
            logging.info("默认用户已创建")
    finally:
        db.close()

 
    ocr_scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    ocr_scheduler.stop()

def dev():
    """开发环境启动函数"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # 启用热重载
        log_level="debug"
    )

def start():
    """生产环境启动函数"""
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        # workers=4,  # 生产环境使用多个工作进程
        log_level="debug"
    )