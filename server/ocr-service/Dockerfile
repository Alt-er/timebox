# 使用Python 3.12官方镜像作为基础镜像
FROM --platform=$TARGETPLATFORM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

# 复制pyproject.toml和poetry.lock
COPY server/ocr-service/pyproject.toml server/ocr-service/poetry.lock ./

# 配置poetry不创建虚拟环境(因为在容器中不需要)
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 复制项目文件
COPY server/ocr-service .

# 设置环境变量
ENV PYTHONPATH=/app \
    PROJECT_NAME="OCR Service" \
    OCR_API_TOKEN="your-secret-ocr-token" \
    CORS_ORIGINS="http://localhost,http://localhost:5174" \
    OCR_SERVER_HOST="0.0.0.0" \
    OCR_SERVER_PORT=8001

# 暴露端口
EXPOSE 8001

# 启动命令
CMD ["poetry", "run", "start"]

