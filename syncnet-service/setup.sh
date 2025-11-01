#!/bin/bash
# Setup script for SyncNet service
# This script:
# 1. Clones SyncNet repository
# 2. Downloads model weights
# 3. Sets up Python environment
# 4. Verifies ffmpeg installation

set -e  # Exit on error

echo "================================================"
echo "SyncNet Service Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from correct directory
if [ ! -f "app.py" ]; then
    echo -e "${RED}Error: Please run this script from the syncnet-service directory${NC}"
    exit 1
fi

# Step 1: Check ffmpeg
echo "Step 1: Checking ffmpeg installation..."
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}✓ ffmpeg is installed${NC}"
    ffmpeg -version | head -n 1
else
    echo -e "${RED}✗ ffmpeg is not installed${NC}"
    echo ""
    echo "Please install ffmpeg:"
    echo "  - Ubuntu/Debian: sudo apt-get install ffmpeg"
    echo "  - macOS: brew install ffmpeg"
    echo "  - Windows: choco install ffmpeg"
    exit 1
fi
echo ""

# Step 2: Clone SyncNet repository
echo "Step 2: Cloning SyncNet repository..."
if [ -d "syncnet_python" ]; then
    echo -e "${YELLOW}syncnet_python directory already exists, skipping clone${NC}"
else
    git clone https://github.com/joonson/syncnet_python.git
    echo -e "${GREEN}✓ SyncNet repository cloned${NC}"
fi
echo ""

# Step 3: Download models
echo "Step 3: Downloading SyncNet models..."
cd syncnet_python

if [ -f "data/syncnet_v2.model" ]; then
    echo -e "${YELLOW}Models already exist, skipping download${NC}"
else
    # Check if download script exists
    if [ -f "download_model.sh" ]; then
        chmod +x download_model.sh
        ./download_model.sh
    else
        echo -e "${YELLOW}download_model.sh not found${NC}"
        echo "Please download models manually from:"
        echo "https://www.robots.ox.ac.uk/~vgg/software/lipsync/"
    fi
fi

# Move models to models directory
cd ..
mkdir -p models

if [ -f "syncnet_python/data/syncnet_v2.model" ]; then
    cp syncnet_python/data/syncnet_v2.model models/
    echo -e "${GREEN}✓ Copied syncnet_v2.model${NC}"
fi

if [ -f "syncnet_python/data/sfd_face.pth" ]; then
    cp syncnet_python/data/sfd_face.pth models/
    echo -e "${GREEN}✓ Copied sfd_face.pth${NC}"
fi
echo ""

# Step 4: Create virtual environment
echo "Step 4: Setting up Python virtual environment..."
if [ -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment already exists${NC}"
else
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
fi
echo ""

# Step 5: Install dependencies
echo "Step 5: Installing Python dependencies..."
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 6: Create .env file
echo "Step 6: Creating .env file..."
if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists${NC}"
else
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo "Please edit .env file to configure the service"
fi
echo ""

# Step 7: Verify installation
echo "Step 7: Verifying installation..."
python -c "import torch; print(f'PyTorch {torch.__version__}')"
python -c "import cv2; print(f'OpenCV {cv2.__version__}')"
python -c "import flask; print(f'Flask {flask.__version__}')"
echo -e "${GREEN}✓ Installation verified${NC}"
echo ""

# Summary
echo "================================================"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Activate the virtual environment:"
echo "     source venv/bin/activate"
echo ""
echo "  2. Start the server:"
echo "     python app.py"
echo ""
echo "  3. Test the health endpoint:"
echo "     curl http://localhost:5000/health"
echo ""
echo "Models location: ./models/"
echo "Temp directory: ./tmp/"
echo ""
