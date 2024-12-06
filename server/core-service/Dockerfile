# 使用多阶段构建
FROM --platform=$TARGETPLATFORM python:3.12-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 最终阶段
FROM --platform=$TARGETPLATFORM python:3.12-slim

WORKDIR /app

# 只安装运行时必需的包
RUN apt-get update && apt-get install -y \
    curl \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 从builder阶段复制Python包
COPY --from=builder /usr/local/lib/python3.12/site-packages/ /usr/local/lib/python3.12/site-packages/

# 复制项目文件
COPY . .
RUN mkdir -p uploads/screenshots

# 设置环境变量
ENV PYTHONPATH=/app \
    PROJECT_NAME="Core Service" \
    UPLOAD_DIR=/app/uploads/screenshots \
    POSTGRES_SERVER=postgres \
    POSTGRES_PORT=5432 \
    POSTGRES_USER=postgres \
    POSTGRES_PASSWORD=password \
    POSTGRES_DB=app_db \
    SECRET_KEY="your-secret-key" \
    OCR_SERVICE_URLS="http://localhost:8001/ocr" \
    OCR_SERVICE_TOKENS="timebox_123"

EXPOSE 8000
CMD ["python", "run.py"]

