import platform
from typing import List, Dict, Any
import multiprocessing as mp
from multiprocessing.pool import Pool
import asyncio
import logging
from functools import partial
from PIL import Image
import numpy as np
import io
from app.core.config import settings

def setup_logger(name: str) -> logging.Logger:
    """配置日志器"""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger

class OCRWorker:
    """OCR工作进程"""
    def __init__(self):
        self.logger = setup_logger(f"{__name__}.worker")
        self.ocr = None
        self.is_mac = platform.system() == "Darwin"
        self._initialize()
        
    def _initialize(self):
        """初始化OCR实例"""
        if not self.is_mac and self.ocr is None:
            try:
                if settings.USE_CUDA:
                    from rapidocr_paddle import RapidOCR
                    self.ocr = RapidOCR(det_use_cuda=True, cls_use_cuda=True, rec_use_cuda=True)
                elif settings.USE_DML:
                    from rapidocr_onnxruntime import RapidOCR
                    self.ocr = RapidOCR(det_use_dml=True, cls_use_dml=True, rec_use_dml=True)
                else:
                    from rapidocr_onnxruntime import RapidOCR
                    self.ocr = RapidOCR()
                self.logger.info("OCR引擎初始化成功")
            except Exception as e:
                self.logger.error(f"OCR初始化失败: {e}")
                raise

    def process_image(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """处理单张图片"""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            self.logger.info(f"开始处理图片, 尺寸: {image.size}")
            
            if self.is_mac:
                from ocrmac import ocrmac
                result = ocrmac.OCR(image, language_preference=['zh-Hans']).recognize(px=True)
            else:
                img_array = np.array(image)
                result, _ = self.ocr(img_array)
                
            if not result:
                return []
                
            processed_results = []
            for item in result:
                if self.is_mac:
                    text, confidence, position = item
                else:
                    position, text, confidence = item
                    
                processed_results.append({
                    'text': text,
                    'confidence': float(confidence) if not self.is_mac else confidence,
                    'position': position
                })
            
            return processed_results
            
        except Exception as e:
            self.logger.error(f"图片处理错误: {e}")
            raise

class OCRProcessor:
    """OCR处理器"""
    def __init__(self):
        self.logger = setup_logger(f"{__name__}.processor")
        self._pool = None
        self._semaphore = None
        self._initialize()
        
    @staticmethod
    def _initialize_worker():
        mp.current_process().worker = OCRWorker()

    def _initialize(self):
        """初始化进程池和信号量"""
        if self._pool is None:
            self._pool = Pool(
                processes=settings.OCR_NUM_WORKERS,
                initializer=self._initialize_worker
            )
            self._semaphore = asyncio.Semaphore(settings.OCR_NUM_WORKERS)
            self.logger.info(f"OCR进程池初始化完成, 工作进程数: {settings.OCR_NUM_WORKERS}")

    async def process_image_async(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """异步处理图片"""
        async with self._semaphore:
            try:
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    None,
                    self._pool.apply_async,
                    func=lambda: mp.current_process().worker.process_image(image_bytes)
                ).get()
                return result
            except Exception as e:
                self.logger.error(f"异步处理失败: {e}")
                raise

    async def cleanup(self):
        """清理资源"""
        if self._pool:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._pool.close)
            await loop.run_in_executor(None, self._pool.join)
            self._pool = None
            self.logger.info("OCR进程池已清理")

    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.cleanup()
