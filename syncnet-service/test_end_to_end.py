"""
End-to-end test of Flask service with EfficientNetV2
"""

import requests
import json
import cv2
import numpy as np
import tempfile
import os
import time


def create_test_video(duration_sec=3, fps=25):
    """Create a test video with some content"""
    print(f"Creating test video: {duration_sec}s @ {fps}FPS")

    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
    video_path = temp_file.name
    temp_file.close()

    # Video properties
    width, height = 640, 480
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    total_frames = duration_sec * fps

    for i in range(total_frames):
        # Create frame with animated content
        frame = np.zeros((height, width, 3), dtype=np.uint8)

        # Animated gradient
        t = i / total_frames
        for y in range(height):
            for x in range(width):
                frame[y, x] = [
                    int((x / width) * 255 * (1 - t) + t * 128),
                    int((y / height) * 255 * t + (1 - t) * 128),
                    int(((x + y) / (width + height)) * 255)
                ]

        # Add text
        cv2.putText(frame, f"Test Video - Frame {i+1}/{total_frames}",
                   (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                   (255, 255, 255), 2)

        # Add moving circle
        cx = int(width * (0.5 + 0.3 * np.sin(2 * np.pi * t)))
        cy = int(height * (0.5 + 0.3 * np.cos(2 * np.pi * t)))
        cv2.circle(frame, (cx, cy), 30, (0, 255, 0), -1)

        out.write(frame)

    out.release()

    file_size = os.path.getsize(video_path) / 1024  # KB
    print(f"✓ Video created: {video_path}")
    print(f"  - Size: {file_size:.2f} KB")
    print(f"  - Frames: {total_frames}")

    return video_path


def test_health_endpoint():
    """Test /health endpoint"""
    print("\n[Test 1] Testing /health endpoint...")

    url = "http://localhost:5000/health"

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()

        data = response.json()

        # Validate response
        assert data['status'] == 'healthy', "Service should be healthy"
        assert 'detectors' in data, "Should have detectors info"
        assert 'efficientnetv2_b2' in data['detectors'], "Should have EfficientNetV2"

        env2_detector = data['detectors']['efficientnetv2_b2']
        assert env2_detector['enabled'] == True, "EfficientNetV2 should be enabled"
        assert env2_detector['available'] == True, "EfficientNetV2 should be available"

        print("✓ /health endpoint test passed")
        print(f"  - Service: {data['service']}")
        print(f"  - Version: {data['version']}")
        print(f"  - EfficientNetV2-B2: {'✓ Enabled' if env2_detector['enabled'] else '✗ Disabled'}")

        return True

    except Exception as e:
        print(f"✗ /health endpoint test failed: {e}")
        return False


def test_score_endpoint():
    """Test /score endpoint with real video"""
    print("\n[Test 2] Testing /score endpoint with video...")

    # Create test video
    video_path = create_test_video(duration_sec=3, fps=25)

    try:
        # Prepare request
        url = "http://localhost:5000/score"
        payload = {
            "video_path": video_path,
            "session_id": "test_e2e_001"
        }

        print(f"\n  - Sending request to {url}")
        print(f"  - Session ID: {payload['session_id']}")

        # Send request
        start_time = time.time()
        response = requests.post(url, json=payload, timeout=60)
        elapsed = time.time() - start_time

        response.raise_for_status()
        data = response.json()

        print(f"  - Request completed in {elapsed:.2f}s")

        # Validate response structure
        assert 'combined_score' in data, "Should have combined_score"
        assert 'score' in data, "Should have score (backward compat)"
        assert 'decision' in data, "Should have decision"
        assert 'is_likely_real' in data, "Should have is_likely_real"
        assert 'confidence' in data, "Should have confidence"
        assert 'detectors' in data, "Should have detectors"
        assert 'processing_time_ms' in data, "Should have processing_time_ms"
        assert 'session_id' in data, "Should have session_id"

        # Validate only EfficientNetV2 was used
        assert 'efficientnetv2' in data['detectors'], "Should have EfficientNetV2 results"
        assert len(data['detectors']) == 1, f"Should only have 1 detector, got {len(data['detectors'])}"

        # Validate EfficientNetV2 details
        env2 = data['detectors']['efficientnetv2']
        assert 'score' in env2, "EfficientNetV2 should have score"
        assert 'confidence' in env2, "EfficientNetV2 should have confidence"
        assert 'consistency' in env2, "EfficientNetV2 should have consistency"
        assert 'num_frames' in env2, "EfficientNetV2 should have num_frames"
        assert env2['model'] == 'efficientnetv2-b2', "Should specify model"

        # Validate scores are in range
        assert 0 <= data['combined_score'] <= 1, "Combined score should be in [0, 1]"
        assert 0 <= data['confidence'] <= 1, "Confidence should be in [0, 1]"

        # Validate decision
        valid_decisions = ['ALLOW', 'NEXT', 'BLOCK', 'SUSPICIOUS_PERFECT']
        assert data['decision'] in valid_decisions, f"Decision should be one of {valid_decisions}"

        print("\n  ✓ /score endpoint test passed!")
        print(f"\n  Results:")
        print(f"    - Combined score: {data['combined_score']:.4f}")
        print(f"    - Decision: {data['decision']}")
        print(f"    - Is likely real: {data['is_likely_real']}")
        print(f"    - Confidence: {data['confidence']:.4f}")
        print(f"    - Processing time: {data['processing_time_ms']}ms")
        print(f"    - Ensemble mode: {data.get('ensemble_mode', 'N/A')}")
        print(f"\n  EfficientNetV2-B2:")
        print(f"    - Score: {env2['score']:.4f}")
        print(f"    - Confidence: {env2['confidence']:.4f}")
        print(f"    - Consistency: {env2['consistency']:.4f}")
        print(f"    - Frames: {env2['num_frames']}")

        return True

    except Exception as e:
        print(f"\n✗ /score endpoint test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Cleanup
        if os.path.exists(video_path):
            os.remove(video_path)
            print(f"\n  - Cleaned up: {video_path}")


def run_all_tests():
    """Run all end-to-end tests"""
    print("=" * 70)
    print("End-to-End Tests: Flask Service + EfficientNetV2-B2")
    print("=" * 70)

    # Test health endpoint
    health_ok = test_health_endpoint()

    if not health_ok:
        print("\n✗ Health check failed, aborting further tests")
        return False

    # Test score endpoint
    score_ok = test_score_endpoint()

    if health_ok and score_ok:
        print("\n" + "=" * 70)
        print("✓ ALL END-TO-END TESTS PASSED!")
        print("=" * 70)
        print("\nEfficientNetV2-B2 is fully integrated and working correctly!")
        return True
    else:
        print("\n" + "=" * 70)
        print("✗ SOME TESTS FAILED")
        print("=" * 70)
        return False


if __name__ == '__main__':
    import sys
    success = run_all_tests()
    sys.exit(0 if success else 1)
