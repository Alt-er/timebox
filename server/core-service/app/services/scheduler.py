import time
from typing import List, Optional, Tuple
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import SessionLocal
from app.models.image import Image
from app.models.image_ocr import ImageOCR
from app.core.config import settings
import threading
import backoff  # 需要安装这个包用于重试机制
import asyncio
import jieba
import os
import json
from app.services.ocr_client import OCRClient

class OCRScheduler:
    def __init__(self, batch_size: int = 5):
        self.batch_size = batch_size
        self.logger = logging.getLogger(__name__)
        self.ocr_client = OCRClient()  # 使用新的OCR客户端
        self._running = False
        self._current_delay = 10  # 添加初始延迟时间
        self._max_delay = 600     # 最大延迟时间（10分钟）
        
        # 初始化jieba分词设置
        jieba.initialize()

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
        successful_ocr_count = 0
        
        # 收集需要处理OCR的图片路径
        ocr_tasks = []
        for image in images:
            if not image.ocr_completed:
                image_path = f"{settings.UPLOAD_DIR}/{image.file_path}"
                ocr_tasks.append((image, image_path))
        
        if ocr_tasks:
            # 批量处理OCR
            image_paths = [t[1] for t in ocr_tasks]
            ocr_results = await self.ocr_client.process_images(image_paths)
            
            # 处理OCR结果
            for image, image_path in ocr_tasks:
                results = ocr_results.get(image_path)
                if results is not None:
                    try:
                        # 构建结构化的JSON数据
                        ocr_metadata = {
                            "timestamp": image.captured_at.strftime('%Y-%m-%d %H:%M:%S'),
                            "active_app": image.app_name or '',
                            "window_title": image.window_title or '',
                            "ocr_result": results
                        }
                        
                        # 添加多个关键词以支持更灵活的搜索
                        ocr_text = " ".join([item['text'] for item in results]) if results else "Blank image Empty No text  /  空白图片 空 无内容 无文本"
                        
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
                        successful_ocr_count += 1
                        
                    except Exception as e:
                        self.logger.error(f"处理OCR结果失败 {image.id}: {str(e)}")
                        continue
            
            db.commit()

        # 处理词嵌入任务
        for image in images:
            if not image.embedding_completed:
                image.embedding_completed = True
                
        db.commit()
        
        return successful_ocr_count

    async def process_pending_images(self) -> Tuple[int, int]:
        """处理待处理的图片"""
        db = SessionLocal()
        try:
            pending_images = self._get_pending_images(db, limit=self.batch_size)
            total_images = len(pending_images)
            if total_images == 0:
                return 0, 0
            
            self.logger.info(f"开始处理 {total_images} 张图片")
            successful_ocr_count = await self._process_batch(db, pending_images)
            
            return total_images, successful_ocr_count
            
        finally:
            db.close()

    async def _run_loop(self):
        """持续运行处理任务"""
        self.logger.info(f"OCR处理服务启动")
        while self._running:
            start_time = time.time()
            total_count, successful_ocr_count = await self.process_pending_images()
            
            if total_count == 0:
                self._current_delay = 10  # 重置延迟时间
                await asyncio.sleep(10)
            elif successful_ocr_count == 0:
                self.logger.warning(f"所有OCR任务均失败，等待{self._current_delay}秒后重试")
                await asyncio.sleep(self._current_delay)
                # 增加延迟时间，但不超过最大值
                self._current_delay = min(self._current_delay + 10, self._max_delay)
            else:
                self._current_delay = 10  # 重置延迟时间
                elapsed_time = time.time() - start_time
                avg_time = elapsed_time / successful_ocr_count if successful_ocr_count > 0 else 0
                self.logger.info(
                    f"成功处理 {successful_ocr_count}/{total_count} 张图片, "
                    f"总耗时: {elapsed_time:.2f}秒, "
                    f"平均每张: {avg_time:.2f}秒"
                )

    def start(self):
        """启动处理服务"""
        if self._running:
            return
            
        self._running = True
        asyncio.create_task(self._run_loop())

    def stop(self):
        """停止处理服务"""
        self._running = False 