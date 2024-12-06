import platform
from typing import List, Dict, Any
import os
import time
import cpuinfo
from PIL import Image
import numpy as np
import asyncio
import logging
import multiprocessing
from app.core.config import settings
import io
import yaml

def setup_logger():
    """
    在每个进程中设置logger
    
    Returns:
        logging.Logger: 配置好的logger实例
    """
    logger = logging.getLogger(f"{__name__}.{multiprocessing.current_process().name}")
    if not logger.hasHandlers():  # 确保没有处理器时才添加
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(processName)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    logger.propagate = False  # 防止日志消息传播到父记录器
    return logger

def _process_single_image(image_bytes: bytes, is_mac: bool, logger: logging.Logger, ocr=None) -> List[Dict[str, Any]]:
    """
    在单个进程中处理图片
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        logger.info(f"OCR处理开始, 图片尺寸: {image.size}")
        start_time = time.time()
        
        if is_mac:
            from ocrmac import ocrmac
            result = ocrmac.OCR(image, language_preference=['zh-Hans']).recognize(px=True)
        else:
            img_array = np.array(image)
            result, _ = ocr(img_array)
            
        if result is None:
            logger.warning("OCR未识别到任何文本")
            return []
        
        end_time = time.time()
        logger.info(f"OCR处理耗时: {end_time - start_time:.2f}秒")

        processed_results = []
        for item in result:
            if is_mac:
                text, confidence, position = item
            else:
                position, text, confidence = item
            processed_results.append({
                'text': text,
                'confidence': float(confidence) if not is_mac else confidence,
                'position': position
            })
                
        return processed_results
        
    except Exception as e:
        logger.error(f"OCR处理错误: {str(e)}")
        raise

def _create_ocr_instance(logger: logging.Logger):
    """
    创建新的OCR实例，并确保模型路径正确
    """
    try:
        if settings.USE_GPU and settings.USE_DML:
            raise ValueError("不能同时启用 GPU 和 DML 模式")
        
        # 读取配置文件
        config_path = os.path.join(os.path.dirname(__file__), "config.yaml")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"配置文件不存在: {config_path}")
            
        # 读取并更新配置
        with open(config_path, 'r', encoding='utf-8') as f:
            ocr_config = yaml.safe_load(f)
            
        # 更新模型路径为绝对路径
        model_dir = os.path.join(os.path.dirname(__file__), "models")
        ocr_config['Det']['model_path'] = os.path.join(model_dir, os.path.basename(ocr_config['Det']['model_path']))
        ocr_config['Cls']['model_path'] = os.path.join(model_dir, os.path.basename(ocr_config['Cls']['model_path']))
        ocr_config['Rec']['model_path'] = os.path.join(model_dir, os.path.basename(ocr_config['Rec']['model_path']))
        
        # 保存更新后的配置到临时件
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as tmp:
            yaml.safe_dump(ocr_config, tmp)
            temp_config_path = tmp.name
            
        try:
            if settings.USE_GPU:
                from rapidocr_paddle import RapidOCR as RapidOCRPaddle
                ocr = RapidOCRPaddle(
                    det_use_cuda=True,
                    cls_use_cuda=True,
                    rec_use_cuda=True
                )
                logger.info(f"进程 {multiprocessing.current_process().name} 创建RapidOCR Paddle (GPU)实例")
            
            elif settings.USE_DML:
                from rapidocr_onnxruntime import RapidOCR
                ocr = RapidOCR(
                    config_path=temp_config_path,
                    det_use_dml=True,
                    cls_use_dml=True,
                    rec_use_dml=True
                )
                logger.info(f"进程 {multiprocessing.current_process().name} 创建RapidOCR ONNX (DML)实例")
            
            else:
                if 'Intel' in cpuinfo.get_cpu_info()['brand_raw']:
                    from rapidocr_openvino import RapidOCR
                    ocr = RapidOCR(config_path=temp_config_path)
                    logger.info(f"进程 {multiprocessing.current_process().name} 创建RapidOCR OpenVINO (CPU)例")
                else:
                    from rapidocr_onnxruntime import RapidOCR
                    ocr = RapidOCR(config_path=temp_config_path)
                    logger.info(f"进程 {multiprocessing.current_process().name} 创建RapidOCR ONNX (CPU)实例")
            
            return ocr
            
        finally:
            # 清理临时文件
            try:
                os.unlink(temp_config_path)
            except Exception as e:
                logger.warning(f"清理临时配置文件失败: {str(e)}")
                
    except Exception as e:
        logger.error(f"进程 {multiprocessing.current_process().name} OCR初始化失败: {str(e)}")
        raise

class OCRWorker:
    """OCR工作进程类，确保每个进程拥有独立的OCR实例"""
    def __init__(self):
        self.logger = setup_logger()
        self.ocr = None
        self.is_mac = platform.system() == "Darwin"
        
    def initialize(self):
        """懒加载方式初始化OCR实例"""
        if self.ocr is None and not self.is_mac:
            self.ocr = _create_ocr_instance(self.logger)
    
    def process_image(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """处理单张图片"""
        try:
            # 确保OCR实例已初始化
            self.initialize()
            result = _process_single_image(image_bytes, self.is_mac, self.logger, self.ocr)
            return result
        except Exception as e:
            self.logger.error(f"图片处理错误: {str(e)}")
            raise

class OCRProcessor:
    def __init__(self):
        """初始化OCR处理器"""
        self.logger = setup_logger()
        # 创建信号量来限制并发进程数
        self._semaphore = asyncio.Semaphore(settings.OCR_NUM_WORKERS)
        
    async def process_image_async(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """异步处理单张图片"""
        try:
            async with self._semaphore:  # 使用信号量控制并发
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(
                    None,
                    self._process_image_in_new_process,
                    image_bytes
                )
                return result
        except Exception as e:
            self.logger.error(f"异步OCR处理错误: {str(e)}")
            raise

    @staticmethod
    def _process_image_in_new_process(image_bytes: bytes) -> List[Dict[str, Any]]:
        """在新进程中处理图片"""
        worker = OCRWorker()
        return worker.process_image(image_bytes)

    async def cleanup(self):
        """清理资源"""
        # 不再需要清理进程池，因为每次都创建新进程
        pass

    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.cleanup()
