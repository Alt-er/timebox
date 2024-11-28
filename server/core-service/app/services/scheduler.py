import time
from typing import List, Optional
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import SessionLocal
from app.models.image import Image
from app.models.image_ocr import ImageOCR
from .ocr_processor import OCRProcessor
from app.core.config import settings
import threading
import backoff  # 需要安装这个包用于重试机制
import asyncio
import jieba
import os
import json

class OCRScheduler:
    def __init__(self, use_gpu: bool = True, batch_size: int = 5):
        self.use_gpu = use_gpu
        self.batch_size = batch_size
        self.logger = logging.getLogger(__name__)
        self.processor = OCRProcessor(use_gpu=self.use_gpu)
        self._running = False
        
        # 初始化jieba分词设置
        jieba.initialize()  # 预加载词典
        # 可选：添加自定义词典
        # jieba.load_userdict("path/to/dict.txt")
        
        # 可选：调整词典路径
        # dict_path = os.path.join(os.path.dirname(__file__), "dict/custom.txt")
        # if os.path.exists(dict_path):
        #     jieba.load_userdict(dict_path)

    def _get_pending_images(self, db: Session, limit: Optional[int] = None):
        """查询所有未完成的任务"""
        query = db.query(Image).filter(
            (Image.ocr_completed == False) | 
            (Image.embedding_completed == False)
        ).order_by(Image.created_at.asc())
        
        if limit:
            query = query.limit(limit)
            
        return query.all()

    async def _process_batch(self, db: Session, images: List[Image]):
        """处理一批图片"""
        for image in images:
            try:
                # 独立处理OCR任务
                if not image.ocr_completed:
                    image_path = f"{settings.UPLOAD_DIR}/{image.file_path}"
                    results = await self.processor.process_image_async(image_path)
                    
                    
                    
                    # 构建结构化的JSON数据
                    ocr_metadata = {
                        "timestamp": image.captured_at.strftime('%Y-%m-%d %H:%M:%S'),
                        "active_app": image.app_name or '',
                        "window_title": image.window_title or '',
                        "ocr_result": results
                    }
                    
                    ocr_text = " ".join([item['text'] for item in results])
                    
                    # 构建搜索文本并分词
                    search_text = "\n".join([
                        f"timestamp: {ocr_metadata['timestamp']}",
                        f"active_app: {ocr_metadata['active_app']}",
                        f"window_title: {ocr_metadata['window_title']}",
                        f"ocr_result: {ocr_text}"
                    ])
                    search_text_seg = " ".join(jieba.cut_for_search(search_text))
                    
                    image_ocr = db.query(ImageOCR).get(image.id)
                    if not image_ocr:
                        image_ocr = ImageOCR(id=image.id, ocr_metadata=ocr_metadata)
                        db.add(image_ocr)
                    else:
                        image_ocr.ocr_metadata = ocr_metadata
                    
                    image_ocr.search_vector = func.to_tsvector('simple', search_text_seg)
                    image.ocr_completed = True
                    db.commit()
                
                # 独立处理词嵌入任务
                if not image.embedding_completed:
                    # 暂时直接标记为完成
                    image.embedding_completed = True
                    self.logger.info(f"图片 {image.id} 词嵌入标记为完成（暂未实现）")
                    db.commit()
                
            except Exception as e:
                db.rollback()
                self.logger.error(f"处理图片 {image.id} 时出错: {str(e)}")
                continue
            

    async def process_pending_images(self) -> int:
        """处理待处理的图片"""
        db = SessionLocal()
        try:
            pending_images = self._get_pending_images(db, limit=self.batch_size)
            if not pending_images:
                return 0
                
            self.logger.info(f"开始处理 {len(pending_images)} 张图片")
            await self._process_batch(db, pending_images)
            return len(pending_images)
            
        finally:
            db.close()

    async def _run_loop(self):
        """持续运行处理任务"""
        self.logger.info(f"OCR处理服务启动，使用GPU: {self.use_gpu}")
        while self._running:
            processed_count = await self.process_pending_images()
            if processed_count == 0:
                await asyncio.sleep(10)
            else:
                self.logger.info(f"成功处理 {processed_count} 张图片，继续处理下一批...")

    def start(self):
        """启动处理服务"""
        if self._running:
            return
            
        self._running = True
        asyncio.create_task(self._run_loop())

    def stop(self):
        """停止处理服务"""
        self._running = False 