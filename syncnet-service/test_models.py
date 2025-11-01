"""
Test script to verify SyncNet models load correctly
"""
import os
import sys
from pathlib import Path

print("=" * 60)
print("SyncNet Model Loading Test")
print("=" * 60)

# Check environment
print("\n1. Checking environment...")
print(f"   Python: {sys.version}")
print(f"   Working directory: {os.getcwd()}")

# Check if models exist
print("\n2. Checking model files...")
model_path = Path("models/syncnet_v2.model")
detector_path = Path("models/sfd_face.pth")

if model_path.exists():
    size_mb = model_path.stat().st_size / (1024 * 1024)
    print(f"   ✓ SyncNet model: {model_path} ({size_mb:.1f} MB)")
else:
    print(f"   ✗ SyncNet model NOT FOUND: {model_path}")

if detector_path.exists():
    size_mb = detector_path.stat().st_size / (1024 * 1024)
    print(f"   ✓ Face detector: {detector_path} ({size_mb:.1f} MB)")
else:
    print(f"   ✗ Face detector NOT FOUND: {detector_path}")

# Check if SyncNet repository exists
print("\n3. Checking SyncNet repository...")
syncnet_repo = Path("syncnet_python")
if syncnet_repo.exists():
    print(f"   ✓ Repository found: {syncnet_repo}")
    # Add to path
    sys.path.insert(0, str(syncnet_repo))
else:
    print(f"   ✗ Repository NOT FOUND: {syncnet_repo}")

# Try importing dependencies
print("\n4. Testing imports...")
try:
    import torch
    print(f"   ✓ PyTorch {torch.__version__}")
except ImportError as e:
    print(f"   ✗ PyTorch: {e}")

try:
    import cv2
    print(f"   ✓ OpenCV {cv2.__version__}")
except ImportError as e:
    print(f"   ✗ OpenCV: {e}")

try:
    import numpy as np
    print(f"   ✓ NumPy {np.__version__}")
except ImportError as e:
    print(f"   ✗ NumPy: {e}")

try:
    import scipy
    print(f"   ✓ SciPy {scipy.__version__}")
except ImportError as e:
    print(f"   ✗ SciPy: {e}")

# Try importing SyncNet classes
print("\n5. Testing SyncNet imports...")
try:
    from SyncNetInstance import SyncNetInstance
    print("   ✓ SyncNetInstance imported successfully")
except ImportError as e:
    print(f"   ✗ SyncNetInstance: {e}")
    sys.exit(1)

try:
    from SyncNetModel import SyncNetModel
    print("   ✓ SyncNetModel imported successfully")
except ImportError as e:
    print(f"   ✗ SyncNetModel: {e}")

# Try loading the SyncNet model
print("\n6. Testing model loading...")
try:
    import torch
    syncnet = SyncNetModel()

    # Load model weights
    s = torch.load(str(model_path), map_location=torch.device('cpu'))
    syncnet.load_state_dict(s)

    print("   ✓ SyncNet model loaded successfully!")
    print(f"   ✓ Model structure: {syncnet}")

except Exception as e:
    print(f"   ✗ Failed to load SyncNet model: {e}")
    import traceback
    traceback.print_exc()

# Test wrapper initialization
print("\n7. Testing SyncNet wrapper...")
try:
    from syncnet_wrapper import SyncNetWrapper

    wrapper = SyncNetWrapper(
        model_path=str(model_path),
        detector_path=str(detector_path),
        tmp_dir='./tmp'
    )

    if wrapper.syncnet_available:
        print("   ✓ SyncNet wrapper initialized successfully!")
        print(f"   ✓ SyncNet available: {wrapper.syncnet_available}")
    else:
        print("   ✗ SyncNet wrapper initialized but NOT AVAILABLE")

except Exception as e:
    print(f"   ✗ Failed to initialize wrapper: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
