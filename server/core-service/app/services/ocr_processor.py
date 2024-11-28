import platform
from typing import List, Dict, Any
import os
import time
import cpuinfo  # 确保导入cpuinfo模块
from PIL import Image  # 确保导入PIL库
import numpy as np  # 确保导入numpy库
from concurrent.futures import ThreadPoolExecutor
import asyncio
import logging  # 添加在文件开头的import部分

class OCRProcessor:
    def __init__(self, use_gpu: bool = True):
        """
        初始化OCR处理器
        Args:
            use_gpu: 是否使用GPU加速,默认False
        """
        config_path = "ocr_config.yaml"  # 确保配置路径正确

        if platform.system() == 'Windows' and 'Intel' in cpuinfo.get_cpu_info()['brand_raw']:
            from rapidocr_openvino import RapidOCR
            self.ocr = RapidOCR(config_path=config_path)
        else:
            from rapidocr_onnxruntime import RapidOCR
            self.ocr = RapidOCR(config_path=config_path)
        self.executor = ThreadPoolExecutor(max_workers=4)  # 创建线程池
        self.logger = logging.getLogger(__name__)  # 在__init__中添加logger
    
    def process_image(self, image_path: str) -> List[Dict[str, Any]]:
        """
        处理单张图片的OCR识别
        Args:
            image_path: 图片路径
        Returns:
            识别结果列表,每个元素包含文本内容和位置信息
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"图片文件不存在: {image_path}")
        
        start_time = time.time()  # 开始计时

        if platform.system() == "Darwin":
            from ocrmac import ocrmac
            result = ocrmac.OCR(image_path, language_preference=['zh-Hans']).recognize(px=True)
            # print(result)
        else:
            # with Image.open(image_path) as img:  # 修正变量名为image_path
            #     img = img.convert("RGB")
            #     img.thumbnail((1920, 1920))  # 假设MAX_THUMBNAIL_SIZE为(800, 800)
            #     img_array = np.array(img)
            # result, _ = self.ocr(img_array)  # 确保调用ocr方法
            result, _ = self.ocr(image_path)  # 确保调用ocr方法
            # print(result)
        end_time = time.time()  # 结束计时
        self.logger.info(f"OCR处理耗时: {end_time - start_time:.2f}秒")  # 替换print为logger.info

        processed_results = []
        for item in result:
            if platform.system() == "Darwin":
                # item 是一个元组，例如 (text, confidence, position)
                text, confidence, position = item
                processed_results.append({
                    'text': text,  # 识别的文本
                    'confidence': confidence,  # 置信度
                    'position': position  # 文本框位置坐标
                })
            else:
                # item 是一个列表，例如 [[x1, y1], [x2, y2], [x3, y3], [x4, y4]], 'text', confidence
                position, text, confidence = item
                processed_results.append({
                    'text': text,  # 识别的文本
                    'confidence': float(confidence),  # 置信度
                    'position': position  # 文本框位置坐标
                })
                
        return processed_results
    
    async def process_image_async(self, image_path: str) -> List[Dict[str, Any]]:
        """
        异步处理图片的方法
        Args:
            image_path: 图片路径
        Returns:
            OCR识别结果列表
        """
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            self.executor,
            self.process_image,
            image_path
        )
    
    async def process_multiple_images_async(self, image_paths: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        批量处理多张图片
        """
        results = {}
        for image_path in image_paths:
            try:
                results[image_path] = await self.process_image_async(image_path)
            except Exception as e:
                results[image_path] = {'error': str(e)}
                
        return results
