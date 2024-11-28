# 使用Python 3.12官方镜像作为基础镜像
FROM --platform=$TARGETPLATFORM python:3.12-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements.txt
COPY server/core-service/requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制项目文件
COPY server/core-service .

# 创建上传目录
RUN mkdir -p uploads/screenshots

# 设置环境变量
ENV PYTHONPATH=/app
ENV UPLOAD_DIR=/app/uploads/screenshots

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]