# 使用Python 3.12官方镜像作为基础镜像
FROM --platform=$TARGETPLATFORM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    python3-dev \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# 复制pyproject.toml和poetry.lock
COPY server/core-service/pyproject.toml server/core-service/poetry.lock ./

# 配置poetry不创建虚拟环境(因为在容器中不需要)
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 复制项目文件
COPY server/core-service .

# 创建上传目录
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

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["poetry", "run", "start"]

