"""
Unit tests for EfficientNetV2 Detector
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ensemble.efficientnetv2_detector import EfficientNetV2Detector
from PIL import Image
import numpy as np


def test_initialization():
    """Test detector initialization"""
    print("\n[Test 1] Testing detector initialization...")

    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    assert detector is not None, "Detector should be initialized"
    assert detector.device.type == 'cpu', "Should use CPU device"
    assert detector.confidence_threshold == 0.5, "Default threshold should be 0.5"

    print("✓ Detector initialization test passed")


def test_predict_single_image():
    """Test single image prediction"""
    print("\n[Test 2] Testing single image prediction...")

    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    # Create test image
    test_image = Image.new('RGB', (260, 260), color=(128, 128, 128))

    result = detector.predict_image(test_image)

    # Validate result structure
    assert 'is_real' in result, "Result should contain 'is_real'"
    assert 'score' in result, "Result should contain 'score'"
    assert 'confidence' in result, "Result should contain 'confidence'"
    assert 'probabilities' in result, "Result should contain 'probabilities'"

    # Validate types
    assert isinstance(result['is_real'], bool), "'is_real' should be bool"
    assert isinstance(result['score'], float), "'score' should be float"
    assert isinstance(result['confidence'], float), "'confidence' should be float"

    # Validate ranges
    assert 0 <= result['score'] <= 1, "'score' should be in [0, 1]"
    assert 0 <= result['confidence'] <= 1, "'confidence' should be in [0, 1]"

    # Validate probabilities
    assert 'real' in result['probabilities'], "Should have 'real' probability"
    assert 'fake' in result['probabilities'], "Should have 'fake' probability"

    real_prob = result['probabilities']['real']
    fake_prob = result['probabilities']['fake']

    assert 0 <= real_prob <= 1, "'real' probability should be in [0, 1]"
    assert 0 <= fake_prob <= 1, "'fake' probability should be in [0, 1]"
    assert abs((real_prob + fake_prob) - 1.0) < 0.01, "Probabilities should sum to ~1"

    print(f"  - is_real: {result['is_real']}")
    print(f"  - score: {result['score']:.4f}")
    print(f"  - confidence: {result['confidence']:.4f}")
    print("✓ Single image prediction test passed")


def test_predict_multiple_frames():
    """Test multiple frame prediction"""
    print("\n[Test 3] Testing multiple frame prediction...")

    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    # Create multiple test frames
    frames = []
    for i in range(10):
        color = (100 + i*10, 100 + i*10, 100 + i*10)
        frame = Image.new('RGB', (260, 260), color=color)
        frames.append(frame)

    result = detector.predict_frames(frames, aggregate_method='mean')

    # Validate result structure
    assert 'is_real' in result
    assert 'score' in result
    assert 'confidence' in result
    assert 'consistency' in result
    assert 'num_frames' in result
    assert 'frame_scores' in result
    assert 'statistics' in result
    assert 'model' in result

    # Validate values
    assert result['num_frames'] == 10, f"Should have 10 frames, got {result['num_frames']}"
    assert len(result['frame_scores']) == 10, "Should have 10 frame scores"
    assert result['model'] == 'efficientnetv2-b2', "Model should be efficientnetv2-b2"

    # Validate statistics
    stats = result['statistics']
    assert 'mean' in stats
    assert 'median' in stats
    assert 'std' in stats
    assert 'min' in stats
    assert 'max' in stats
    assert 'q25' in stats
    assert 'q75' in stats

    print(f"  - num_frames: {result['num_frames']}")
    print(f"  - score: {result['score']:.4f}")
    print(f"  - consistency: {result['consistency']:.4f}")
    print(f"  - mean: {stats['mean']:.4f}")
    print(f"  - std: {stats['std']:.4f}")
    print("✓ Multiple frame prediction test passed")


def test_aggregate_methods():
    """Test different aggregation methods"""
    print("\n[Test 4] Testing aggregation methods...")

    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    # Create test frames
    frames = [Image.new('RGB', (260, 260), color=(128, 128, 128)) for _ in range(5)]

    methods = ['mean', 'median', 'max', 'voting']

    for method in methods:
        result = detector.predict_frames(frames, aggregate_method=method)
        assert result['aggregate_method'] == method, f"Should use {method} aggregation"
        assert 'score' in result, f"Should have score for {method}"
        print(f"  - {method}: score={result['score']:.4f}")

    print("✓ Aggregation methods test passed")


def test_different_image_sizes():
    """Test prediction with different image sizes"""
    print("\n[Test 5] Testing different image sizes...")

    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    sizes = [(224, 224), (512, 512), (100, 100), (640, 480)]

    for size in sizes:
        test_image = Image.new('RGB', size, color=(128, 128, 128))
        result = detector.predict_image(test_image)

        assert 'score' in result, f"Should handle size {size}"
        print(f"  - Size {size}: score={result['score']:.4f}")

    print("✓ Different image sizes test passed")


def run_all_tests():
    """Run all tests"""
    print("=" * 70)
    print("Running EfficientNetV2 Detector Unit Tests")
    print("=" * 70)

    try:
        test_initialization()
        test_predict_single_image()
        test_predict_multiple_frames()
        test_aggregate_methods()
        test_different_image_sizes()

        print("\n" + "=" * 70)
        print("✓ ALL TESTS PASSED!")
        print("=" * 70)
        return True

    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    except Exception as e:
        print(f"\n✗ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
