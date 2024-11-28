from sqlalchemy import Column, Integer, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB ,TSVECTOR
from app.db.database import Base

class ImageOCR(Base):
    __tablename__ = "t_image_ocr"

    id = Column(Integer, ForeignKey('t_images.id', ondelete='CASCADE'), primary_key=True)
    ocr_metadata = Column(JSONB)
    search_vector = Column(TSVECTOR)

    __table_args__ = (
        Index('idx_image_ocr_search_vector', 'search_vector', postgresql_using='gin'),
    )
 