"""
Integration test for EfficientNetV2 with Orchestrator
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ensemble.orchestrator import EnsembleOrchestrator
from ensemble.efficientnetv2_detector import EfficientNetV2Detector
import cv2
import tempfile
import numpy as np


def create_test_video(duration_sec=2, fps=25):
    """Create a simple test video"""
    print(f"  - Creating test video: {duration_sec}s @ {fps}FPS")

    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    video_path = temp_file.name
    temp_file.close()

    # Video properties
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    total_frames = duration_sec * fps

    # Generate frames with varying content
    for i in range(total_frames):
        # Create frame with color gradient
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Add gradient
        for y in range(height):
            for x in range(width):
                frame[y, x] = [
                    int((x / width) * 255),
                    int((y / height) * 255),
                    int(((x + y) / (width + height)) * 255)
                ]

        # Add frame counter text
        cv2.putText(frame, f"Frame {i+1}/{total_frames}",
                   (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1,
                   (255, 255, 255), 2)

        out.write(frame)

    out.release()
    print(f"  - Video created: {video_path}")
    print(f"  - Total frames: {total_frames}")

    return video_path


def test_orchestrator_with_efficientnetv2():
    """Test Orchestrator with only EfficientNetV2 enabled"""
    print("\n[Integration Test] Orchestrator with EfficientNetV2...")

    # Initialize detector
    detector = EfficientNetV2Detector(
        model_path=None,
        device='cpu',
        use_pretrained=True
    )

    # Create orchestrator with ONLY EfficientNetV2
    orchestrator = EnsembleOrchestrator(
        syncnet_wrapper=None,
        efficientnet_detector=None,
        vit_detector=None,
        efficientnetv2_detector=detector,
        weights={
            'syncnet': 0.0,
            'efficientnet': 0.0,
            'vit': 0.0,
            'efficientnetv2': 1.0
        }
    )

    print("✓ Orchestrator initialized with EfficientNetV2 only")

    # Create test video
    video_path = create_test_video(duration_sec=2, fps=25)

    try:
        # Analyze video
        print("\n  - Analyzing video with orchestrator...")
        result = orchestrator.analyze_video(video_path, session_id='test_integration')

        # Validate result structure
        assert 'combined_score' in result, "Should have combined_score"
        assert 'score' in result, "Should have score (backward compat)"
        assert 'decision' in result, "Should have decision"
        assert 'is_likely_real' in result, "Should have is_likely_real"
        assert 'detectors' in result, "Should have detectors details"
        assert 'ensemble_mode' in result, "Should have ensemble_mode"
        assert 'processing_time_ms' in result, "Should have processing_time_ms"

        # Validate only EfficientNetV2 was used
        assert 'efficientnetv2' in result['detectors'], "Should have EfficientNetV2 results"
        assert 'syncnet' not in result['detectors'], "Should NOT have SyncNet results"
        assert 'efficientnet' not in result['detectors'], "Should NOT have EfficientNet-B0 results"
        assert 'vit' not in result['detectors'], "Should NOT have ViT results"

        # Validate EfficientNetV2 details
        env2_details = result['detectors']['efficientnetv2']
        assert 'score' in env2_details, "Should have score"
        assert 'confidence' in env2_details, "Should have confidence"
        assert 'consistency' in env2_details, "Should have consistency"
        assert 'num_frames' in env2_details, "Should have num_frames"
        assert env2_details['model'] == 'efficientnetv2-b2', "Should specify model"

        # Validate ensemble mode
        assert result['ensemble_mode'] == 'efficientnetv2_only', f"Should be efficientnetv2_only, got {result['ensemble_mode']}"

        # Validate detectors_used
        assert result['detectors_used'] == ['efficientnetv2'], f"Should only use efficientnetv2, got {result['detectors_used']}"

        # Print results
        print("\n  ✓ Analysis complete!")
        print(f"\n  Results:")
        print(f"    - Combined score: {result['combined_score']:.4f}")
        print(f"    - Decision: {result['decision']}")
        print(f"    - Is likely real: {result['is_likely_real']}")
        print(f"    - Processing time: {result['processing_time_ms']}ms")
        print(f"    - Ensemble mode: {result['ensemble_mode']}")
        print(f"\n  EfficientNetV2-B2 Details:")
        print(f"    - Score: {env2_details['score']:.4f}")
        print(f"    - Confidence: {env2_details['confidence']:.4f}")
        print(f"    - Consistency: {env2_details['consistency']:.4f}")
        print(f"    - Frames analyzed: {env2_details['num_frames']}")

        print("\n✓ Integration test passed!")
        return True

    except Exception as e:
        print(f"\n✗ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"\n  - Cleaned up test video: {video_path}")


def run_integration_tests():
    """Run all integration tests"""
    print("=" * 70)
    print("Running EfficientNetV2 Integration Tests")
    print("=" * 70)

    success = test_orchestrator_with_efficientnetv2()

    if success:
        print("\n" + "=" * 70)
        print("✓ ALL INTEGRATION TESTS PASSED!")
        print("=" * 70)

    return success


if __name__ == '__main__':
    success = run_integration_tests()
    sys.exit(0 if success else 1)
