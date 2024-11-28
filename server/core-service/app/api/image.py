# app/api/items.py

import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel
from app.core.config import settings
from PIL import Image
from PIL.ExifTags import TAGS
from io import BytesIO
import json
import logging
from sqlalchemy.orm import Session
from fastapi import Depends
from app.db.database import get_db
from app.models.image import Image as ImageModel
from datetime import datetime

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 定义数据模型
class UploadImageResponse(BaseModel):
    status: int
    id: int
 

router = APIRouter()

def get_image_metadata(image_content: bytes) -> dict:
    """
    从图片内容中提取 ImageDescription 中的元数据
    
    Args:
        image_content: 图片的二进制内容
        
    Returns:
        dict: 解析后的元数据，如果解析失败则返回空字典
    """
    try:
        image = Image.open(BytesIO(image_content))
        if hasattr(image, '_getexif'):
            exif = image._getexif()
            if exif:
                for tag_id in exif:
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == 'ImageDescription':
                        desc = exif.get(tag_id)
                        try:
                            metadata = json.loads(desc)
                            return metadata
                        except json.JSONDecodeError as e:
                            break
    except Exception as e:
        pass
    
    return {}

@router.post("/upload", response_model=UploadImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="只支持图片文件上传")
        
        content = await file.read()
        
        # 获取元数据
        metadata = get_image_metadata(content)
        app_name = metadata.get('appName')
        window_title = metadata.get('windowTitle')
        
        # 处理文件名和路径
        filename = file.filename
        name_parts = os.path.splitext(filename)
        date_time = name_parts[0]
        extension = name_parts[1][1:]
        
        directory = date_time[2:8]
        file_name = date_time[9:]
        relative_path = f"{directory}/{file_name}.{extension}"
        
        # 从文件名解析时间
        try:
            date_str = f"20{directory[:2]}-{directory[2:4]}-{directory[4:6]} {file_name[:2]}:{file_name[2:4]}:{file_name[4:6]}"
            captured_at = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError as e:
            raise HTTPException(status_code=400, detail="无法获取有效的截屏时间")
        
        # 构建完整的保存路径
        full_save_path = os.path.join(settings.UPLOAD_DIR, directory, f"{file_name}.{extension}")
        os.makedirs(os.path.dirname(full_save_path), exist_ok=True)
        
        # 保存文件
        try:
            with open(full_save_path, "wb") as f:
                f.write(content)
        except Exception as e:
            raise HTTPException(status_code=500, detail="文件保存失败")
        
        db_image = ImageModel(
            file_path=relative_path,
            file_extension=extension,
            app_name=app_name,
            window_title=window_title,
            captured_at=captured_at,
            ocr_completed=False,
            embedding_completed=False
        )
        
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        return {
            "status": 200,
            "id": db_image.id,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"处理上传请求时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail="服务器内部错误")

# @router.get("/{item_id}", response_model=Item)
# async def read_item(item_id: str):
#     # 添加简单的错误处理
#     if item_id not in ["Foo", "Bar"]:
#         raise HTTPException(status_code=404, detail="Item not found")
    
#     return {"item_id": item_id, "name": f"{item_id} Item", "description": f"This is {item_id}"}
    # 确保上传目录存在
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # 读取文件内容
    content = await file.read()
    
    # 读取EXIF信息
    exif_data = {}
    image_metadata = {}
    try:
        image = Image.open(BytesIO(content))
        if hasattr(image, '_getexif'):
            exif = image._getexif()
            if exif:
                for tag_id in exif:
                    tag = TAGS.get(tag_id, tag_id)
                    data = exif.get(tag_id)
                    exif_data[tag] = data
                    
                # 解析 ImageDescription 中的 JSON 数据
                if 'ImageDescription' in exif_data:
                    try:
                        image_metadata = json.loads(exif_data['ImageDescription'])
                        logger.info(f"解析后的元数据: {image_metadata}")
                    except json.JSONDecodeError as e:
                        logger.error(f"JSON解析失败: {str(e)}")
                        
        logger.info(f"EXIF信息: {exif_data}")
    except Exception as e:
        logger.error(f"读取EXIF信息失败: {str(e)}")
    
    # 保存文件
    with open(save_path, "wb") as f:
        f.write(content)
    
    # 返回符合 Item 模型的字典
    return {"id": 1, "exif_data": exif_data, "metadata": image_metadata}

# @router.get("/{item_id}", response_model=Item)
# async def read_item(item_id: str):
#     # 添加简单的错误处理
#     if item_id not in ["Foo", "Bar"]:
#         raise HTTPException(status_code=404, detail="Item not found")
    
#     return {"item_id": item_id, "name": f"{item_id} Item", "description": f"This is {item_id}"}