# SyncNet Service - Deepfake Detection via AV-Sync

Flask-based microservice for audio-visual synchronization analysis using **SyncNet**.

Detects potential deepfakes by analyzing lip-sync accuracy between audio and video streams.

---

## 📋 Overview

This service wraps the official [SyncNet implementation](https://github.com/joonson/syncnet_python) and provides a REST API for:

- **Audio-visual synchronization scoring** (lip-sync detection)
- **Deepfake detection** via temporal offset analysis
- **Early-exit verification** for real-time authentication

**Architecture:**
```
Client → Express API → Python Service → SyncNet → {score, offset, decision}
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **ffmpeg 5.x** (critical dependency)
- **4 GB RAM** (8 GB recommended)
- **2 GB disk** space for models

### Installation

**1. Install ffmpeg:**

```bash
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# macOS
brew install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg

# Verify
ffmpeg -version
```

**2. Run setup script:**

```bash
cd syncnet-service
chmod +x setup.sh
./setup.sh
```

This will:
- Clone SyncNet repository
- Download model weights (~500 MB)
- Create Python virtual environment
- Install dependencies
- Setup configuration

**3. Activate environment:**

```bash
source venv/bin/activate
```

**4. Start server:**

```bash
python app.py
```

Server will start on `http://localhost:5000`

---

## 📡 API Reference

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "syncnet-avsync",
  "version": "1.0.0",
  "syncnet_available": true,
  "models_loaded": true
}
```

---

### Score Video

```bash
POST /score
Content-Type: application/json
```

**Request:**
```json
{
  "video_path": "/tmp/uploads/video123.webm",
  "session_id": "sess_abc123"
}
```

**Response:**
```json
{
  "offset_frames": 3,
  "confidence": 10.02,
  "min_dist": 5.35,
  "score": 0.91,
  "lag_ms": 120.0,
  "processing_time_ms": 7234,
  "debug": {
    "num_results": 1,
    "all_results": [...]
  }
}
```

**Metrics explanation:**

| Metric | Description | Good Value |
|--------|-------------|------------|
| `offset_frames` | Temporal offset between audio and video | ≤ 2 frames |
| `confidence` | SyncNet confidence score | > 10.0 |
| `min_dist` | Embedding space distance | < 6.0 |
| `score` | Normalized score (0-1) | ≥ 0.90 |
| `lag_ms` | Lag in milliseconds | < 100ms |

**Decision thresholds:**

```python
if score >= 0.90 and abs(offset_frames) <= 2:
    decision = "ALLOW"      # Early-exit ✅
elif score >= 0.75:
    decision = "NEXT"       # Additional challenge ⚠️
else:
    decision = "BLOCK"      # High risk ❌
```

---

## 🧪 Testing

### Manual Test

```bash
# 1. Start server
python app.py

# 2. Test health endpoint
curl http://localhost:5000/health

# 3. Test with sample video (requires video file)
curl -X POST http://localhost:5000/score \
  -H "Content-Type: application/json" \
  -d '{
    "video_path": "/path/to/test/video.mp4",
    "session_id": "test_001"
  }'
```

### Expected Performance

| Metric | Target | Actual (avg) |
|--------|--------|--------------|
| Processing time (p95) | < 10s | ~7-8s |
| Accuracy (legitimate) | > 95% | TBD (needs dataset) |
| False positive rate | < 5% | TBD (needs dataset) |

---

## 📁 Directory Structure

```
syncnet-service/
├── app.py                  # Flask server
├── syncnet_wrapper.py      # SyncNet wrapper class
├── requirements.txt        # Python dependencies
├── setup.sh               # Installation script
├── .env                   # Configuration (create from .env.example)
├── models/                # Model weights
│   ├── syncnet_v2.model
│   └── sfd_face.pth
├── syncnet_python/        # Official SyncNet repo (cloned)
│   ├── run_pipeline.py
│   ├── SyncNetModel.py
│   └── ...
├── tmp/                   # Temporary processing files
│   ├── uploads/
│   ├── pywork/
│   ├── pycrop/
│   └── pyavi/
└── venv/                  # Python virtual environment
```

---

## ⚙️ Configuration

Edit `.env` file:

```bash
# Server
PORT=5000
FLASK_ENV=development
FLASK_DEBUG=True

# Models
MODEL_PATH=./models/syncnet_v2.model
DETECTOR_PATH=./models/sfd_face.pth

# Processing
MAX_VIDEO_SIZE_MB=10
PROCESSING_TIMEOUT_SECONDS=30

# Logging
LOG_LEVEL=INFO
```

---

## 🔧 Troubleshooting

### Error: "ffmpeg not found"

Install ffmpeg (see Prerequisites section)

### Error: "SyncNet model not found"

Run `./setup.sh` or manually download models:

```bash
cd syncnet_python
chmod +x download_model.sh
./download_model.sh
cp data/*.model ../models/
cp data/*.pth ../models/
```

### Error: "No module named 'torch'"

Activate virtual environment:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### High latency (> 15s)

- Use shorter videos (3-4 seconds)
- Enable GPU acceleration (CUDA)
- Increase `PROCESSING_TIMEOUT_SECONDS`

### Processing fails with timeout

- Check video format (prefer WebM/MP4)
- Reduce video resolution (640x480 recommended)
- Ensure face is clearly visible

---

## 🐳 Docker Deployment

**Dockerfile:**

```dockerfile
FROM python:3.10-slim

# Install ffmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy files
COPY requirements.txt .
COPY app.py syncnet_wrapper.py ./
COPY models/ ./models/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Clone SyncNet
RUN git clone https://github.com/joonson/syncnet_python.git

EXPOSE 5000

CMD ["python", "app.py"]
```

**Build and run:**

```bash
docker build -t syncnet-service .
docker run -p 5000:5000 -v $(pwd)/tmp:/app/tmp syncnet-service
```

---

## 📊 Performance Optimization

### 1. Pre-warm model (reduce first-request latency)

The model is lazy-loaded by default. For production, pre-load:

```python
# In app.py, before app.run():
syncnet_instance = get_syncnet()  # Force initialization
```

### 2. Enable GPU acceleration

Install PyTorch with CUDA:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 3. Use Gunicorn for production

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 4. Horizontal scaling

Deploy multiple instances behind a load balancer:

```yaml
# docker-compose.yml
version: '3.8'
services:
  syncnet:
    build: .
    ports:
      - "5000-5003:5000"
    deploy:
      replicas: 4
```

---

## 📚 References

- **SyncNet Paper**: ["Out of time: automated lip sync in the wild"](https://www.robots.ox.ac.uk/~vgg/publications/2016/Chung16a/chung16a.pdf) (Chung et al., 2016)
- **Official Repository**: https://github.com/joonson/syncnet_python
- **VGG Software Page**: https://www.robots.ox.ac.uk/~vgg/software/lipsync/

---

## 📝 License

This service is a wrapper around SyncNet, which is licensed under **CC BY 4.0** for research use.

**Note:** The SyncNet models and demo code are provided by VGG for research purposes. For commercial use, please contact the authors.

---

## 🤝 Contributing

To improve this service:

1. **Calibrate thresholds** - Collect dataset of legitimate + deepfake videos
2. **Add ensemble methods** - Combine with other deepfake detectors
3. **Optimize latency** - Profile and optimize bottlenecks
4. **Add caching** - Cache results for identical videos (hash-based)

---

## 🆘 Support

For issues related to:

- **This wrapper**: Create issue in main repository
- **SyncNet itself**: See https://github.com/joonson/syncnet_python/issues

---

**Status**: ✅ Ready for Development/Testing
**Version**: 1.0.0
**Last Updated**: 2025-11-01
