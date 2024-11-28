from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import TSVECTOR
from app.models.custom_types import VectorType
from app.db.database import Base  # 使用共同的 Base

class Image(Base):
    __tablename__ = "t_images"

    id = Column(Integer, primary_key=True, index=True)
    file_path = Column(Text, nullable=False)  # 文件路径
    file_extension = Column(Text)  # 文件后缀
    app_name = Column(Text)  # 活动的应用名称
    window_title = Column(Text)  # 窗口标题
    ocr_completed = Column(Boolean, default=False)  # OCR完成标志
    embedding_completed = Column(Boolean, default=False)  # 词嵌入完成标志
    created_at = Column(DateTime, server_default=func.now())  # 创建时间
    captured_at = Column(DateTime, nullable=False)  # 截屏时间
    deleted_at = Column(DateTime, nullable=True)  # 删除时间