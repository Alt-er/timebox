# 构建阶段
FROM --platform=$TARGETPLATFORM python:3.12-slim as builder

WORKDIR /app

# 安装构建依赖
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装依赖
RUN pip install --no-cache-dir -r requirements.txt

RUN pip install rapidocr-openvino

# 最终阶段
FROM --platform=$TARGETPLATFORM python:3.12-slim

WORKDIR /app

# 只安装运行时必需的包
RUN apt-get update && apt-get install -y \
    curl \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 从builder阶段复制Python包
COPY --from=builder /usr/local/lib/python3.12/site-packages/ /usr/local/lib/python3.12/site-packages/

# 复制项目文件
COPY . .

# 设置环境变量
ENV PYTHONPATH=/app \
    PROJECT_NAME="OCR Service" \
    OCR_API_TOKEN="your-secret-ocr-token" \
    OCR_SERVER_HOST="0.0.0.0" \
    OCR_SERVER_PORT=8001

# 暴露端口
EXPOSE 8001

# 启动命令
CMD ["python", "run.py"]

