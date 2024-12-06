#### [简体中文](README-zh_CN.md)

# Timebox

> Turning every screen moment into a memory at your fingertips.

Timebox is an open-source screen recording and retrieval tool consisting of a client and a server. The client captures screenshots at fixed intervals and uploads them to the server. The server stores the screenshots, performs OCR (optical character recognition) processing, and supports quick searches based on time ranges and text content. With Timebox, users can easily revisit and quickly locate past moments, creating their own "screen moment search engine."

---

## Features

- 🖥️ **Full-Screen Capture**: The client periodically captures the screen and uploads it to the server.
- 🔍 **Text Search**: OCR extracts text from screenshots, stores it in a PostgreSQL database, and supports content-based searches.
- 📅 **Time Filtering**: Screenshots can be filtered by time range for rapid navigation to target moments.
- 🌐 **Web-Based Search**: The server provides an intuitive web interface for searching and viewing screenshots.
- 💾 **Data Persistence**: Persistent management of screenshots and OCR data allows long-term historical record retrieval.
- 🚀 **Open Source & Extensible**: Fully open-source, supporting custom deployments and feature extensions.

---

## Project Inspiration and Differences

Timebox is inspired by the following project:

- [Pensieve](https://github.com/arkohut/pensieve)  

Key differences between the two are highlighted below:

| Feature         | Pensieve                   | Timebox                         |
|-----------------|---------------------------|---------------------------------|
| Data Storage     | Local storage             | Centralized server storage, multi-client support |
| OCR Processing   | Client-side (or server)   | Server-side unified processing (cluster-capable) |
| Retrieval Method | Local search              | Server-powered web search       |
| Architecture     | Standalone client         | Client-server separation         |

Timebox offers more robust server-side support, making it suitable for managing and retrieving large-scale screenshot data.

---

## Installation Guide  

### Client Installation  

The Timebox client supports **macOS** and **Windows**. Follow these steps to install it:  

1. Visit the [Timebox Release Page](https://github.com/Alt-er/timebox/releases) and download the client installer for your system:  
   - For macOS, download the `.dmg` file.  
   - For Windows, download the `.exe` file.  
2. Install the client:
   - **macOS**: Double-click the `.dmg` file and drag Timebox to the Applications folder.  
   - **Windows**: Double-click the `.exe` file and follow the installation wizard.  
3. After installation, launch the client and check the system tray (Windows) or menu bar (macOS) for the Timebox icon. If visible, the installation was successful.
4. Open the client and configure the server settings.

### Server Deployment  

The Timebox server supports **Linux**, **macOS**, and **Windows**. Choose one of the two deployment methods below:  

#### Method 1: Deploy with Docker (CPU Only)

> Note: The Docker deployment method supports OCR services in CPU mode only. For GPU-accelerated OCR, manually deploy the OCR service (other services can still use Docker).

##### 1. Create and Navigate to the Project Directory
```
mkdir timebox
cd timebox
```

##### 2. Download Configuration Files
```
# Download environment configuration file
curl https://raw.githubusercontent.com/Alt-er/timebox/main/.env.example -o .env
# Download Docker Compose configuration file
curl https://raw.githubusercontent.com/Alt-er/timebox/main/docker-compose.yml -o docker-compose.yml
```

##### 3. Configure and Start
```
# Edit the environment configuration file
vi .env

# Start services
docker compose up -d
```

##### 4. Access the Service
Visit `http://{server IP}:8000` to access the web interface. Configure this address in the client as well.

#### Method 2: Manual Deployment

> Note: Manual deployment supports both CPU and GPU modes for OCR services.
> macOS uses GPU acceleration automatically without extra configuration, while Windows requires manual configuration for DML mode.
> You can manually deploy OCR services on macOS or Windows, while using Docker for other services.

##### 1. Install Miniconda and PostgreSQL
- Refer to the [Miniconda Documentation](https://docs.anaconda.com/miniconda/install/#quick-command-line-install) for installation instructions.
- Visit the [PostgreSQL Download Page](https://www.postgresql.org/download/) to install PostgreSQL 16 or 17.

##### 2. Clone the Project
```
git clone https://github.com/Alt-er/timebox
cd timebox
```

##### 3. Configure OCR Service
```
# Create and activate a virtual environment
conda create -n ocr-service python=3.12
conda activate ocr-service

# Navigate to the OCR service directory
cd timebox/server/ocr-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies with Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

##### Run in OpenVINO CPU Mode (Optional, Intel CPUs Only)
```
# Install Intel CPU support
pip install rapidocr-openvino
# Install with Tsinghua mirror
pip install rapidocr-openvino -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### DirectML GPU Mode (Optional, Windows Only)
```
# Create an environment configuration file
echo USE_DML=true > .env

# Switch to DirectML backend
pip uninstall onnxruntime
pip install onnxruntime-directml
# Install with Tsinghua mirror
pip install onnxruntime-directml -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Configure Settings
```
# Create the .env file
cp .env.example .env

# Edit the .env file
vi .env
```

###### Start the OCR Service
```
python run.py
```

##### 4. Configure Core Service
```
conda create -n core-service python=3.12
conda activate core-service

# Navigate to the Core service directory
cd timebox/server/core-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies with Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Configure Settings
```
# Create the .env file
cp .env.example .env

# Edit the .env file
vi .env
```

###### Start the Core Service
```
python run.py
```

##### 5. Access the Service
Visit `http://{server IP}:8000` to access the web interface. Configure this address in the client as well.

#### Common Conda Commands
```
# Virtual environments isolate Python projects to avoid dependency conflicts.

# Exit the current virtual environment
conda deactivate

# Activate a specific virtual environment
conda activate ocr-service

# List all virtual environments
conda env list

# Remove a specific virtual environment
conda env remove -n ocr-service
```
