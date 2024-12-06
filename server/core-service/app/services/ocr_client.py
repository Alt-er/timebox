import aiohttp
import asyncio
from typing import Dict, List, Optional
import logging
from app.core.config import settings, OCRServiceConfig

class OCRClient:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self._service_semaphores: Dict[str, asyncio.Semaphore] = {}
        self._current_service_index = 0  # 添加服务索引计数器
        
        # 为每个OCR服务创建信号量
        for service in settings.OCR_SERVICES:
            self._service_semaphores[service.url] = asyncio.Semaphore(
                settings.OCR_CONCURRENT_LIMIT
            )
    
    async def _call_single_service(
        self,
        service: OCRServiceConfig,
        image_path: str
    ) -> Optional[List[Dict]]:
        """调用单个OCR服务"""
        async with self._service_semaphores[service.url]:
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {"Authorization": f"Bearer {service.token}"}
                    
                    # 准备文件
                    with open(image_path, 'rb') as f:
                        data = aiohttp.FormData()
                        data.add_field('file',
                                     f,
                                     filename=image_path.split('/')[-1])
                        
                        async with session.post(
                            service.url,
                            data=data,
                            headers=headers,
                            timeout=service.timeout
                        ) as response:
                            if response.status == 200:
                                return await response.json()
                            else:
                                self.logger.error(
                                    f"OCR服务 {service.url} {image_path} 返回错误: {response.status}"
                                )
                                return None
                                
            except Exception as e:
                self.logger.error(f"调用OCR服务 {service.url} {image_path} 失败: {str(e)}")
                return None
    
    async def process_images(self, image_paths: List[str]) -> Dict[str, List[Dict]]:
        """
        并发处理多张图片，返回图片路径到OCR结果的映射
        """
        results = {}
        tasks = []
        
        # 为每张图片创建任务
        for image_path in image_paths:
            task = asyncio.create_task(self._process_single_image(image_path))
            tasks.append((image_path, task))
            
        # 等待所有任务完成
        for image_path, task in tasks:
            try:
                result = await task
                results[image_path] = result
            except Exception as e:
                self.logger.error(f"处理图片失败 {image_path}: {str(e)}")
                results[image_path] = None
                
        return results
    
    async def _process_single_image(self, image_path: str) -> Optional[List[Dict]]:
        """
        处理单张图片，每次处理直接轮换使用不同的OCR服务
        """
        services_count = len(settings.OCR_SERVICES)
        if services_count == 0:
            self.logger.error("没有可用的OCR服务")
            return None

        # print(self._current_service_index)

        # 获取当前服务并更新索引
        service = settings.OCR_SERVICES[self._current_service_index]
        self._current_service_index = (self._current_service_index + 1) % services_count
        
        # 尝试调用服务
        result = await self._call_single_service(service, image_path)
        if result is not None:
            return result
            
        # self.logger.error(f"本次OCR服务调用失败, 跳过, service: {service.url}")
        return None 