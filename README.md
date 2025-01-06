# Timebox

> Make every screen moment a touchable memory

Timebox is an open-source screen recording and retrieval tool, consisting of a client and a server. The client automatically takes screenshots at fixed time intervals and uploads them to the server, where the screenshots undergo storage and OCR (optical character recognition) processing. It supports fast retrieval based on time ranges and text content. With Timebox, users can easily trace back and quickly find past records, building their own "screen moment search engine."

---

## Key Features

- 🖥️ **Full-Screen Screenshot**: The client takes screenshots at regular intervals and automatically uploads them to the server.
- 🔍 **Text Retrieval**: OCR technology recognizes the text in the screenshots, which is stored in a PostgreSQL database and supports text-based searching.
- 📅 **Time Filtering**: Allows filtering screenshots by time range to quickly locate target records.
- 🌐 **Web Retrieval**: Provides an intuitive web interface for users to search and view screenshots.
- 💾 **Data Persistence**: The server persists screenshots and OCR data, supporting long-term history tracking.
- 🚀 **Open Source and Extensible**: Completely open source, supporting personalized deployment and functionality extensions.

---

## Project Inspiration and Differences

Timebox is inspired by the following projects:

- [Pensieve](https://github.com/arkohut/pensieve)  

The following are the key differences between Timebox and Pensieve:

| Feature           | Pensieve                    | Timebox                        |
|-------------------|-----------------------------|--------------------------------|
| Data Storage      | Local storage               | Centralized server storage, supports multiple clients |
| OCR Processing    | Client-side (can be server-side) | Server-side unified processing (supports clustering) |
| Retrieval Method  | Local retrieval              | Web-based retrieval interface |
| Architecture      | Can run independently on the client | Client-server separated design |

Timebox provides more robust server support, making it more suitable for scenarios that require centralized management and retrieval of large-scale screenshot data.

---

## Installation Guide  

### Client Installation  

Timebox client supports **macOS** and **Windows** platforms. Please follow the steps below to install:  

1. Go to the [Timebox Release Page](https://github.com/Alt-er/timebox/releases) to download the appropriate client installer for your system:  
   - macOS users should download the file with the `.dmg` extension.  
   - Windows users should download the file with the `.exe` extension.  
2. Follow the installation instructions for your platform:  
   - macOS: Double-click the `.dmg` file and drag Timebox into the Applications folder.  
   - Windows: Double-click the `.exe` file and follow the installation wizard to complete the installation.  
3. Once installation is complete, launch the client and check if the Timebox icon appears in the system tray (Windows) or menu bar (macOS), indicating a successful installation.
4. After starting the client, click settings to configure the server (make sure the server is already set up).
5. Once configured, click the "Start Recording" button, and the client will begin automatically capturing screenshots and uploading them to the server.


### Server Deployment  

Timebox server supports **Linux**, **macOS**, and **Windows** platforms. You can choose one of the following two methods for deployment:  

> OCR service supports the following deployment modes:

| ID  | Deployment Method | OS        | CPU Mode | GPU Mode | Remarks                             |
|-----|-------------------|-----------|----------|----------|-------------------------------------|
| 1   | Docker            | Linux     | ✓ Supported | ✓ CUDA Supported | Requires NVIDIA GPU and drivers, check with nvidia-smi |
| 2   | Docker            | Windows   | ✓ Supported | ✓ CUDA Supported | Requires WSL2 + Docker, supports NVIDIA GPU |
| 3   | Manual Deployment | Windows   | ✓ Supported | ✓ DirectML Supported | Supports multiple GPUs, including NVIDIA, AMD, Intel |
| 4   | Manual Deployment | macOS     | ✓ Supported | ✓ MPS Supported | Supports Apple Silicon and Intel chips, automatic GPU acceleration |
| 5   | Manual Deployment | Linux     | ✓ Supported | ✓ CUDA Supported | Requires NVIDIA GPU and drivers |

#### Method 1: Deploy using Docker

> For Windows systems, please execute inside WSL after installing WSL2 and Docker Desktop.

##### 1. Create and enter the project directory
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
# Edit the environment configuration file
vi .env

# When editing the environment configuration file, modify the following settings as per your actual setup:

# TZ: Time zone, default is Asia/Shanghai

# Database-related configuration
# POSTGRES_USER: PostgreSQL database username
# POSTGRES_PASSWORD: PostgreSQL database password
# POSTGRES_DB: PostgreSQL database name
# POSTGRES_PORT: PostgreSQL database port, default is 5432

# Web management-related configuration
# SECRET_KEY: Key for session encryption, recommended to use a random string, make sure to change the default value
# DEFAULT_USERNAME: Set default admin username for logging into the web interface
# DEFAULT_PASSWORD: Set default admin password for logging into the web interface

# OCR service configuration
# OCR_CONCURRENT_LIMIT: Maximum number of concurrent OCR tasks, adjust based on server performance
# OCR_SERVICE_URLS: OCR service URLs, multiple URLs separated by commas
# OCR_API_TOKEN: OCR service authentication token, ensure the values in core-service and ocr-service match
# USE_CUDA: Enable CUDA GPU acceleration (requires NVIDIA GPU), comment out to disable, set to true to enable
# USE_DML: Enable DirectML GPU acceleration (only supported on Windows systems), true/false, default is false
# OCR_NUM_WORKERS: Number of OCR service workers
# OCR_SERVICE_TOKENS: List of OCR service authentication tokens, multiple tokens separated by commas, must match OCR_API_TOKEN in core-service

# Example configuration file content:

# Configuration for deployment methods 1 and 2 is the same, the difference is that Windows environments require WSL2 and Docker Desktop, then execute Docker commands in WSL, essentially it's Linux.
SECRET_KEY=11111111111111
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=admin
USE_CUDA=true   # Set to true if you have CUDA acceleration, otherwise omit this line, do not set it to false

# Start the service
docker compose up -d
```
##### 4. Access the service
Access the service at `http://{server_IP}:8000/timebox`. Please configure the client to use `http://{server_IP}:8000` as the address.

#### Method 2: Manual Deployment

> Note: Manual deployment supports both CPU and GPU modes for running the OCR service.
> 
> macOS systems will automatically use GPU acceleration without additional configuration, while Windows systems need to manually configure DML mode for GPU usage.
> 
> OCR services can be manually deployed on macOS or Windows, while other services are deployed using Docker.

##### 1. Install Miniconda and PostgreSQL
- Visit the [Miniconda official documentation](https://docs.anaconda.com/miniconda/install/#quick-command-line-install) for installation instructions
- Visit the [PostgreSQL 16/17 download page](https://www.postgresql.org/download/) to install PostgreSQL 16 or 17

##### 2. Clone the project
```
git clone https://github.com/Alt-er/timebox
cd timebox
```

##### 3. OCR Service Configuration
```
# Create and activate a virtual environment
conda create -n ocr-service python=3.12
conda activate ocr-service

# Enter the ocr-service directory
cd timebox/server/ocr-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies using Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

##### OpenVINO CPU Mode (Optional, only supports Intel CPUs)
```
# For Intel CPUs 
pip install rapidocr-openvino 
# For Intel CPUs using Tsinghua mirror
pip install rapidocr-openvino -i https://pypi.tuna.tsinghua.edu.cn/simple
```

##### DirectML GPU Mode (Optional, only supports Windows)
```
# Create environment configuration file
echo USE_DML=true > .env

# Switch to DirectML backend
pip uninstall onnxruntime
pip install onnxruntime-directml
# Install using Tsinghua mirror
pip install onnxruntime-directml -i https://pypi.tuna.tsinghua.edu.cn/simple
```

##### Modify Configuration
```
# Create the .env file
cp .env.example .env

# Edit the .env file
vi .env
```

##### Run OCR Service
```
python run.py
```

##### 4. Core Service Configuration
```
conda create -n core-service python=3.12
conda activate core-service

# Enter the core-service directory
cd timebox/server/core-service

# Install dependencies
pip install -r requirements.txt
# Install dependencies using Tsinghua mirror
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

##### Modify Configuration
```
# Create the .env file
cp .env.example .env

# Edit the .env file
vi .env
```

##### Run Core Service
```
python run.py
```

##### 5. Access the Service
Access the service at `http://{server_IP}:8000/timebox`. Please configure the client to use `http://{server_IP}:8000` as the address.


#### Common Conda Commands
```
# Virtual environments are used to isolate different project Python environments to avoid dependency conflicts.

# Exit the current virtual environment
conda deactivate

# Activate a specific virtual environment
conda activate ocr-service

# View all virtual environments
conda env list

# Remove a specific virtual environment
conda env remove -n ocr-service
```
