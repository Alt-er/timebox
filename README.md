#### [简体中文](README-zh_CN.md)

# Timebox

> Make every screen moment a memory at your fingertips  

Timebox is an open-source screen recording and retrieval tool that consists of a client and server. The client automatically captures screenshots at fixed intervals and uploads them to the server. The server stores the screenshots, processes them with OCR (Optical Character Recognition), and supports fast retrieval based on time range and textual content. With Timebox, users can easily revisit and quickly find past records, building a "screen moment search engine" of their own.

---

## Features

- 🖥️ **Full-Screen Capture**: The client periodically captures screenshots and automatically uploads them to the server.
- 🔍 **Text Search**: Recognize text in screenshots using OCR and store it in a PostgreSQL database, supporting text-based searches.
- 📅 **Time Filtering**: Filter screenshots by time range to quickly locate target records.
- 🌐 **Web-Based Search**: Intuitive web interface for searching and viewing screenshots.
- 💾 **Persistent Data Storage**: The server persistently manages screenshots and OCR data, enabling long-term historical record tracking.
- 🚀 **Open Source & Extensible**: Fully open-source, supporting personalized deployment and feature expansion.

---

## Inspiration & Differences

Timebox draws inspiration from the following project:

- [Pensieve](https://github.com/arkohut/pensieve)  

Key differences are as follows:

| Feature         | Pensieve                  | Timebox                        |
|-----------------|--------------------------|--------------------------------|
| Data Storage    | Local Storage            | Centralized server storage, multi-client support |
| OCR Processing  | Handled by client (or server) | Centralized server processing (cluster-ready) |
| Search Method   | Local search             | Server-provided web search    |
| Architecture    | Independent client usage | Decoupled client-server architecture |

Timebox offers more robust server support, ideal for scenarios requiring centralized management and large-scale screenshot data retrieval.

---

## Installation Guide  

### Client Installation  

Timebox client supports **macOS** and **Windows** platforms. Follow these steps to install:

1. Visit the [Timebox Release Page](https://github.com/Alt-er/timebox/releases) to download the appropriate client installer:
   - For macOS, download the `.dmg` file.
   - For Windows, download the `.exe` file.
2. Follow the platform-specific installation instructions:
   - macOS: Double-click the `.dmg` file and drag Timebox to the Applications folder.
   - Windows: Double-click the `.exe` file and complete the installation wizard.
3. After installation, launch the client. Check if the Timebox icon appears in the system tray (Windows) or menu bar (macOS). If visible, the installation was successful.
4. Open the client settings to configure the server address.

### Server Deployment  

The Timebox server supports **Linux**, **macOS**, and **Windows** platforms. You can deploy it using one of the following two methods:

#### Method 1: Deploy with Docker (CPU Only)

> Note: The Docker deployment method supports CPU mode for OCR services. For GPU-accelerated OCR, manually deploy the OCR service (other services can still use Docker).

##### 1. Create and navigate to the project directory
```
mkdir timebox
cd timebox
```

##### 2. Download configuration files
```
# Download environment configuration file
curl https://raw.githubusercontent.com/Alt-er/timebox/main/.env.example -o .env
# Download docker-compose configuration file
curl https://raw.githubusercontent.com/Alt-er/timebox/main/docker-compose.yml -o docker-compose.yml
```

##### 3. Configure and start
```
# Edit environment configuration file
vi .env

# Start services
docker compose up -d
```

##### 4. Access the server
Access the server at `http://{server_ip}:8000`. Configure this address in the client as well.

#### Method 2: Manual Deployment

> Note: Manual deployment supports both CPU and GPU modes for OCR services. GPU mode is currently supported only on macOS and Windows for manual deployment.

##### 1. Install Miniconda and PostgreSQL
- Visit the [Miniconda Documentation](https://docs.anaconda.com/miniconda/install/#quick-command-line-install) for installation instructions.
- Visit the [PostgreSQL Download Page](https://www.postgresql.org/download/) to install PostgreSQL (version 16 or 17).

##### 2. Clone the repository
```
git clone https://github.com/Alt-er/timebox
cd timebox
```

##### 3. Configure OCR Service
```
# Create and activate a virtual environment
conda create -n ocr-service python=3.12
conda activate ocr-service

# Navigate to the ocr-service directory
cd timebox/server/ocr-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies using Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Run in CPU mode (GPU mode is automatic on macOS)
```
# Install Intel CPU backend
pip install rapidocr-openvino
# Install using Tsinghua mirror
pip install rapidocr-openvino -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Run in GPU (DML) mode (macOS skips this step)
```
# Create environment configuration
echo USE_DML=true > .env

# Switch to DirectML backend
pip uninstall onnxruntime
pip install onnxruntime-directml
# Install using Tsinghua mirror
pip install onnxruntime-directml -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Configure environment
```
# Create .env file
cp .env.example .env

# Edit .env file
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

# Navigate to the core-service directory
cd timebox/server/core-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies using Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

###### Configure environment
```
# Create .env file
cp .env.example .env

# Edit .env file
vi .env
```

###### Start the Core Service
```
python run.py
```

##### 5. Access the server
Access the server at `http://{server_ip}:8000`. Configure this address in the client as well.

---

### Conda Common Commands
```
# Virtual environments isolate Python environments for different projects, avoiding dependency conflicts.

# Deactivate the current virtual environment
conda deactivate

# Activate a specific virtual environment
conda activate ocr-service

# List all virtual environments
conda env list

# Remove a specific virtual environment
conda env remove -n ocr-service
```
