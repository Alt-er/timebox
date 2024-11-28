from sqlalchemy import Column, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import VECTOR
from app.db.database import Base
from sqlalchemy.orm import relationship

class ImageEmbedding(Base):
    __tablename__ = "t_image_embeddings"

    id = Column(Integer, ForeignKey('t_images.id', ondelete='CASCADE'), primary_key=True)
    text_embedding = Column(VECTOR(384))  # 使用384维向量，根据实际模型调整
    
    image = relationship("Image", back_populates="embedding")

    __table_args__ = (
        Index('idx_image_text_embeddings', 'text_embedding', postgresql_using='ivfflat'),
    ) 