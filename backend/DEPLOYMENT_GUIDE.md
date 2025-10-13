# Deployment Guide - Cross-Platform Setup

## Quick Start for Different Environments

### ✅ Minimum Requirements (Works Everywhere)
- Node.js 16+
- MongoDB
- Python 3.9+
- Python packages: `pip install -r requirements-advanced.txt`

**This gives you:**
- ✅ BERT NER (Advanced entity extraction)
- ✅ Layout Analysis (Multi-column detection)
- ✅ Skills & Job Title normalization
- ✅ Validation & HITL

### ⭐ Full Features (Optional OCR)
Everything above PLUS:
- Tesseract OCR (for scanned PDFs)

---

## Setup Instructions by Platform

### Windows

#### 1. Install Node.js & Python
```bash
# Download and install:
# Node.js: https://nodejs.org/
# Python: https://www.python.org/downloads/
```

#### 2. Install Dependencies
```bash
cd backend
npm install
pip install -r requirements-advanced.txt
```

#### 3. Configure Environment
```bash
# Copy example file
copy .env.example .env

# Edit .env and set:
# - MONGO_URI
# - JWT_SECRET
# - Other settings as needed
```

#### 4. (Optional) Install Tesseract for OCR
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Install to: C:\Program Files\Tesseract-OCR

# Then in .env:
USE_OCR=true
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

#### 5. Start Server
```bash
npm start
```

---

### macOS

#### 1. Install Dependencies
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Python
brew install node python@3.9

# Install project dependencies
cd backend
npm install
pip3 install -r requirements-advanced.txt
```

#### 2. Configure Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env with your settings
nano .env
```

#### 3. (Optional) Install Tesseract for OCR
```bash
# Install via Homebrew
brew install tesseract

# In .env:
USE_OCR=true
TESSERACT_PATH=/usr/local/bin/tesseract
# Or leave empty if tesseract is in PATH
```

#### 4. Start Server
```bash
npm start
```

---

### Linux (Ubuntu/Debian)

#### 1. Install Dependencies
```bash
# Update package list
sudo apt update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3 python3-pip

# Install project dependencies
cd backend
npm install
pip3 install -r requirements-advanced.txt
```

#### 2. Configure Environment
```bash
# Copy example file
cp .env.example .env

# Edit .env with your settings
nano .env
```

#### 3. (Optional) Install Tesseract for OCR
```bash
# Install via apt
sudo apt install -y tesseract-ocr

# In .env:
USE_OCR=true
TESSERACT_PATH=/usr/bin/tesseract
# Or leave empty if tesseract is in PATH
```

#### 4. Start Server
```bash
npm start
```

---

## Configuration for Different Environments

### Development (Local Machine)
```bash
# .env
ENABLE_ML_SERVICES=true
USE_BERT_NER=true
USE_LAYOUT_ANALYSIS=true
USE_OCR=true  # If Tesseract installed
USE_KNOWLEDGE_INTEGRATION=true
USE_VALIDATION=true
```

### Production Server (With Tesseract)
```bash
# .env
ENABLE_ML_SERVICES=true
USE_BERT_NER=true
USE_LAYOUT_ANALYSIS=true
USE_OCR=true
TESSERACT_PATH=/usr/bin/tesseract  # Linux
# TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe  # Windows
```

### Production Server (Without Tesseract)
```bash
# .env
ENABLE_ML_SERVICES=true
USE_BERT_NER=true
USE_LAYOUT_ANALYSIS=true
USE_OCR=false  # Disable OCR
USE_KNOWLEDGE_INTEGRATION=true
USE_VALIDATION=true
```

### Minimal Setup (Basic Parsing Only)
```bash
# .env
ENABLE_ML_SERVICES=false  # Disable all ML services
# System will use regex-based parsers
```

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy Python requirements
COPY requirements-advanced.txt ./
RUN pip3 install -r requirements-advanced.txt

# Copy application files
COPY . .

# Expose ports
EXPOSE 3001 5001 5002 5003

# Start server
CMD ["npm", "start"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
      - "5001:5001"
      - "5002:5002"
      - "5003:5003"
    environment:
      - MONGO_URI=mongodb://mongo:27017/peso_db
      - ENABLE_ML_SERVICES=true
      - USE_OCR=true
    depends_on:
      - mongo
    volumes:
      - ./uploads:/app/uploads

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

---

## Troubleshooting by Platform

### Windows Issues

**Python not found:**
```bash
# Add Python to PATH or specify in .env:
PYTHON_PATH=C:\Python39\python.exe
```

**Tesseract not found:**
```bash
# Specify full path in .env:
TESSERACT_PATH=C:\Program Files\Tesseract-OCR\tesseract.exe
```

**Port already in use:**
```powershell
# Find process using port
netstat -ano | findstr "3001"
# Kill process
taskkill /PID <PID> /F
```

### macOS Issues

**Permission denied:**
```bash
# Use sudo for global installs
sudo pip3 install -r requirements-advanced.txt
```

**Tesseract not in PATH:**
```bash
# Add to .zshrc or .bash_profile
export PATH="/usr/local/bin:$PATH"
```

### Linux Issues

**Python packages fail to install:**
```bash
# Install build dependencies
sudo apt install -y python3-dev build-essential
```

**Permission issues:**
```bash
# Use virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-advanced.txt
```

---

## Environment Variables Reference

### Required
```bash
MONGO_URI=mongodb://localhost:27017/peso_db
PORT=3001
JWT_SECRET=your_secret_key
```

### ML Services (Optional)
```bash
ENABLE_ML_SERVICES=true
PYTHON_PATH=  # Leave empty to use system default
USE_BERT_NER=true
USE_LAYOUT_ANALYSIS=true
USE_OCR=false  # Set to true if Tesseract installed
```

### Tesseract (Optional)
```bash
TESSERACT_PATH=  # Leave empty if in PATH
# Windows: C:\Program Files\Tesseract-OCR\tesseract.exe
# macOS: /usr/local/bin/tesseract
# Linux: /usr/bin/tesseract
```

---

## Verification

### Check Services Status
```bash
# Start server
npm start

# In another terminal, check status
curl http://localhost:3001/api/ml-services/status
```

### Expected Response (All Services)
```json
{
  "enabled": true,
  "services": {
    "bertNER": { "running": true, "ready": true },
    "layoutAnalysis": { "running": true, "ready": true },
    "ocr": { "running": true, "ready": true }
  },
  "ready": true
}
```

### Expected Response (No OCR)
```json
{
  "enabled": true,
  "services": {
    "bertNER": { "running": true, "ready": true },
    "layoutAnalysis": { "running": true, "ready": true }
  },
  "ready": true
}
```

---

## Performance Considerations

### Resource Requirements

**Minimum (No ML):**
- RAM: 512MB
- CPU: 1 core
- Disk: 500MB

**With ML Services:**
- RAM: 4GB (2GB for BERT)
- CPU: 2+ cores
- Disk: 2GB

**With OCR:**
- RAM: 5GB
- CPU: 2+ cores
- Disk: 2.5GB

### Optimization Tips

1. **Disable unused services:**
   ```bash
   USE_OCR=false  # If no scanned PDFs
   ```

2. **Use GPU for BERT (if available):**
   - Install PyTorch with CUDA support
   - BERT will automatically use GPU

3. **Adjust timeouts for slower machines:**
   ```bash
   BERT_TIMEOUT=60000
   LAYOUT_TIMEOUT=60000
   OCR_TIMEOUT=120000
   ```

---

## Summary

### ✅ Works on ANY Computer
- Basic parsing (regex-based)
- No Python required

### ✅ Works with Python + Packages
- BERT NER
- Layout Analysis
- Skills & Job Title normalization
- Validation

### ✅ Works with Python + Packages + Tesseract
- Everything above
- OCR for scanned PDFs

**The system gracefully degrades based on what's available!**

---

**Need Help?** See `QUICK_START.md` and `SETUP_COMPLETE.md` for more details.
