"""
Test script to verify EfficientNetV2-B2 model download and initialization
"""

import torch
import timm
from ensemble.efficientnetv2_detector import EfficientNetV2Detector
from PIL import Image
import numpy as np

print("=" * 70)
print("EfficientNetV2-B2 Model Download & Initialization Test")
print("=" * 70)

# Test 1: Verify timm can create the model
print("\n[1/4] Testing timm model creation...")
try:
    model = timm.create_model('tf_efficientnetv2_b2', pretrained=True, num_classes=2)
    print("✓ timm successfully created tf_efficientnetv2_b2 model")
    print(f"  - Model type: {type(model)}")

    # Count parameters
    num_params = sum(p.numel() for p in model.parameters())
    print(f"  - Total parameters: {num_params/1e6:.2f}M")

    # Check classifier
    if hasattr(model, 'classifier'):
        if isinstance(model.classifier, torch.nn.Linear):
            print(f"  - Classifier in_features: {model.classifier.in_features}")
            print(f"  - Classifier out_features: {model.classifier.out_features}")

    print("✓ Model architecture verified")

except Exception as e:
    print(f"✗ Failed to create model: {e}")
    exit(1)

# Test 2: Verify EfficientNetV2Detector initialization
print("\n[2/4] Testing EfficientNetV2Detector initialization...")
try:
    detector = EfficientNetV2Detector(
        model_path=None,  # No fine-tuned model, use pretrained
        device='cpu',
        use_pretrained=True
    )
    print("✓ EfficientNetV2Detector initialized successfully")
    print(f"  - Device: {detector.device}")
    print(f"  - Threshold: {detector.confidence_threshold}")

except Exception as e:
    print(f"✗ Failed to initialize detector: {e}")
    exit(1)

# Test 3: Test single image prediction
print("\n[3/4] Testing single image prediction...")
try:
    # Create a dummy RGB image
    dummy_image = Image.new('RGB', (260, 260), color=(128, 128, 128))
    print(f"  - Created test image: {dummy_image.size} {dummy_image.mode}")

    # Run prediction
    result = detector.predict_image(dummy_image)

    print("✓ Prediction successful")
    print(f"  - is_real: {result['is_real']}")
    print(f"  - score: {result['score']:.4f}")
    print(f"  - confidence: {result['confidence']:.4f}")
    print(f"  - probabilities: real={result['probabilities']['real']:.4f}, fake={result['probabilities']['fake']:.4f}")

except Exception as e:
    print(f"✗ Prediction failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

# Test 4: Test multi-frame prediction
print("\n[4/4] Testing multi-frame prediction...")
try:
    # Create multiple dummy frames
    frames = []
    for i in range(5):
        color = (100 + i*20, 100 + i*20, 100 + i*20)
        frame = Image.new('RGB', (260, 260), color=color)
        frames.append(frame)

    print(f"  - Created {len(frames)} test frames")

    # Run prediction
    result = detector.predict_frames(frames, aggregate_method='mean')

    print("✓ Multi-frame prediction successful")
    print(f"  - is_real: {result['is_real']}")
    print(f"  - score: {result['score']:.4f}")
    print(f"  - confidence: {result['confidence']:.4f}")
    print(f"  - consistency: {result['consistency']:.4f}")
    print(f"  - num_frames: {result['num_frames']}")
    print(f"  - model: {result['model']}")
    print(f"  - Statistics:")
    print(f"    - mean: {result['statistics']['mean']:.4f}")
    print(f"    - std: {result['statistics']['std']:.4f}")
    print(f"    - min: {result['statistics']['min']:.4f}")
    print(f"    - max: {result['statistics']['max']:.4f}")

except Exception as e:
    print(f"✗ Multi-frame prediction failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n" + "=" * 70)
print("✓ ALL TESTS PASSED!")
print("=" * 70)
print("\nEfficientNetV2-B2 is ready to use for deepfake detection.")
print("The model uses ImageNet pretrained weights.")
print("For better deepfake detection, you can fine-tune on a deepfake dataset.")
