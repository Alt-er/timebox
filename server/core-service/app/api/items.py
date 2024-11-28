# app/api/items.py

from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel
import os
from app.services.ocr_processor import OCRProcessor
from sqlalchemy.orm import Session
from fastapi import Depends
from app.db.database import get_db
from app.models.image import Image as ImageModel
from app.core.config import settings
import asyncio

# 定义数据模型
class Item(BaseModel):
    item_id: str
    name: str = None
    description: str = None

router = APIRouter()

ocr_processor = OCRProcessor()

@router.get("", response_model=List[Item])
async def read_items():
    # 返回标准化的数据结构
    return [
        {"item_id": "Foo", "name": "Foo Item", "description": "This is Foo"},
        {"item_id": "Bar", "name": "Bar Item", "description": "This is Bar"}
    ]

@router.get("/{item_id}", response_model=Item)
async def read_item(item_id: str):
    # 添加简单的错误处理
    if item_id not in ["Foo", "Bar"]:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"item_id": item_id, "name": f"{item_id} Item", "description": f"This is {item_id}"}

@router.post("/test-ocr")
async def test_ocr(file: UploadFile = File(...)):
    """测试OCR功能的接口"""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="只支持图片文件上传")
    
    content = await file.read()
    temp_file_path = f"/tmp/{file.filename}"
    with open(temp_file_path, "wb") as temp_file:
        temp_file.write(content)
    
    try:
        # 直接使用异步方法
        ocr_results = await ocr_processor.process_image_async(temp_file_path)
        return {"ocr_results": ocr_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR处理失败: {str(e)}")
    finally:
        os.remove(temp_file_path)

@router.get("/ocr/{image_id}")
async def ocr_image(
    image_id: int,
    db: Session = Depends(get_db)
):
    """从数据库中获取图像并进行OCR处理"""
    db_image = db.query(ImageModel).filter(ImageModel.id == image_id).first()
    if not db_image:
        raise HTTPException(status_code=404, detail="图像未找到")
    
    full_file_path = os.path.join(settings.UPLOAD_DIR, db_image.file_path)
    
    if not os.path.exists(full_file_path):
        raise HTTPException(status_code=404, detail="图像文件未找到")
    
    try:
        # 直接使用异步方法
        ocr_results = await ocr_processor.process_image_async(full_file_path)
        return {"ocr_results": ocr_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR处理失败: {str(e)}")