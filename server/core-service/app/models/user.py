from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

class User(Base):
    __tablename__ = "t_users"  # 修改表名，添加前缀

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(128))
    email = Column(String(100), unique=True, index=True)  # 添加电子邮件字段
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # 添加创建时间字段
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())  # 添加更新时间字段
    is_active = Column(Boolean, default=True)  # 添加活跃状态字段
    is_admin = Column(Boolean, default=False)  # 添加管理员标志字段
  