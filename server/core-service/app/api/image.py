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
from sqlalchemy import select
from sqlalchemy.orm import aliased
from app.models.image_ocr import ImageOCR
from fastapi.responses import FileResponse
from datetime import datetime, timedelta

# 设置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 定义数据模型
class UploadImageResponse(BaseModel):
    status: int
    id: int
 

# 添加请求模型
class SearchRequest(BaseModel):
    query: str
    type: int

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
                # 直接获取ImageDescription对应的tag_id
                desc = exif.get(0x010e)  # 0x010e是ImageDescription的标准tag_id
                if desc:
                    try:
                        metadata = json.loads(desc)
                        return metadata
                    except json.JSONDecodeError:
                        pass
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

@router.post("/search")
async def search_images(
    search_data: SearchRequest,
    db: Session = Depends(get_db)
):
    try:
        # 处理搜索关键词
        query = search_data.query.strip()
        
        # 使用 SQLAlchemy 查询数据库
        ImageAlias = aliased(ImageModel)
        ImageOcrAlias = aliased(ImageOCR)

        if not query:
            # 如果查询为空，直接按截图时间倒序返回
            stmt = (
                select(ImageAlias.file_path, ImageOcrAlias.ocr_metadata)
                .join(ImageOcrAlias, ImageAlias.id == ImageOcrAlias.id)
                .order_by(ImageAlias.captured_at.desc())
                .limit(50)
            )
        else:
            # 有查询词时使用全文检索
            keywords = query.split()
            processed_query = ' & '.join(keywords)
            stmt = (
                select(ImageAlias.file_path, ImageOcrAlias.ocr_metadata)
                .join(ImageOcrAlias, ImageAlias.id == ImageOcrAlias.id)
                .where(ImageOcrAlias.search_vector.match(processed_query))
                .limit(50)
            )

        results = db.execute(stmt).all()

        # 处理结果，移除 position 字段
        processed_results = []
        for result in results:
            metadata = result.ocr_metadata
            if metadata and 'ocr_result' in metadata:
                for item in metadata['ocr_result']:
                    if 'position' in item:
                        del item['position']
                    if 'confidence' in item:
                        item['confidence'] = round(item['confidence'] * 100)
            
            processed_results.append({
                "file_path": result.file_path,
                "ocr_metadata": metadata
            })

        return {
            "status": 200,
            "results": processed_results
        }

    except Exception as e:
        logger.error(f"处理搜索请求时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail="服务器内部错误")

@router.get("/{directory}/{filename}")
async def get_image(directory: str, filename: str):
    try:
        # 构建完整的文件路径
        file_path = os.path.join(settings.UPLOAD_DIR, directory, filename)
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="图片未找到")
            
        # 设置缓存时间（30天）
        cache_time = 30 * 24 * 60 * 60  # 30天的秒数
        
        # 返回图片文件，设置 Content-Disposition 为 inline
        return FileResponse(
            file_path,
            media_type="image/webp",
            headers={
                "Cache-Control": f"public, max-age={cache_time}",
                "Content-Disposition": "inline"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取图片时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail="服务器内部错误")
