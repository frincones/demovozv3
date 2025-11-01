#!/usr/bin/env python3
"""
Test Flask HTTP endpoint with actual video file
Simulates what the frontend does
"""

import requests
import os
import time

def test_flask_endpoint():
    # Flask service URL
    url = 'http://localhost:5000/score'

    # Use existing test video
    video_path = '/workspaces/demovozv3/syncnet-service/tmp/pyavi/complete_test/video.avi'

    if not os.path.exists(video_path):
        print(f"❌ Video not found: {video_path}")
        return False

    print(f"🌐 Testing Flask HTTP endpoint")
    print(f"   URL: {url}")
    print(f"   Video: {video_path}")
    print(f"   Size: {os.path.getsize(video_path)} bytes\n")

    # Prepare JSON payload (as expected by /score endpoint)
    payload = {
        'video_path': video_path,
        'session_id': 'http_test_session'
    }

    print("📤 Sending POST request...")
    start_time = time.time()

    try:
        response = requests.post(url, json=payload, timeout=120)
        elapsed = time.time() - start_time

        print(f"✅ Response received in {elapsed:.1f}s")
        print(f"   Status code: {response.status_code}\n")

        if response.status_code == 200:
            result = response.json()

            print("📊 RESPONSE DATA:")
            print(f"   🎯 SyncNet Results:")
            print(f"      Offset: {result.get('offset_frames')} frames ({result.get('lag_ms')}ms)")
            print(f"      Confidence: {result.get('confidence')}")
            print(f"      Min distance: {result.get('min_dist')}")
            print(f"      Score: {result.get('score')} ({result.get('score', 0)*100:.1f}/100)")
            print(f"      Processing time: {result.get('processing_time_ms')}ms")

            # Check for demo mode
            if 'demo_mode' in result:
                print(f"\n   ⚠️  WARNING: STILL IN DEMO MODE!")
                print(f"      demo_mode: {result['demo_mode']}")
                return False
            else:
                print(f"\n   ✅ REAL analysis (no demo_mode flag)")

            # Compare with known mock values
            mock_values = {
                'offset_frames': 2,
                'confidence': 9.8,
                'min_dist': 5.2,
                'score': 0.89
            }

            is_mock = all(
                result.get(key) == val
                for key, val in mock_values.items()
            )

            if is_mock:
                print(f"\n   ❌ ERROR: Response matches MOCK values exactly!")
                print(f"      Expected variation from mock data")
                return False
            else:
                print(f"\n   ✅ Response values differ from mock (GOOD)")
                print(f"\n🎉 Flask endpoint returning REAL analysis!")
                return True
        else:
            print(f"❌ HTTP error: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except requests.exceptions.Timeout:
        print(f"❌ Request timeout (>120s)")
        return False
    except Exception as e:
        print(f"❌ Request failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_flask_endpoint()
    exit(0 if success else 1)
