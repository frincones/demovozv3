#!/usr/bin/env python3
"""
End-to-end test of the complete SyncNet pipeline
"""

import sys
import os
sys.path.insert(0, '/workspaces/demovozv3/syncnet-service')

from syncnet_wrapper import SyncNetWrapper

def main():
    # Use the same configuration as the Flask service
    wrapper = SyncNetWrapper(
        model_path='/workspaces/demovozv3/syncnet-service/models/syncnet_v2.model',
        detector_path='/workspaces/demovozv3/syncnet-service/models/sfd_face.pth',
        tmp_dir='/workspaces/demovozv3/syncnet-service/tmp'
    )

    # Use the existing test video
    test_video = '/workspaces/demovozv3/syncnet-service/tmp/pyavi/complete_test/video.avi'

    if not os.path.exists(test_video):
        print(f"❌ Test video not found: {test_video}")
        return

    print(f"🎬 Testing complete SyncNet pipeline")
    print(f"   Video: {test_video}")
    print(f"   Reference: end_to_end_test\n")

    try:
        result = wrapper.process_video(test_video, 'end_to_end_test')

        print(f"\n✅ SUCCESS! Real SyncNet results:")
        print(f"   Offset: {result['offset_frames']} frames ({result['lag_ms']}ms)")
        print(f"   Confidence: {result['confidence']}")
        print(f"   Min distance: {result['min_dist']}")
        print(f"   Score: {result['score']} ({result['score']*100:.1f}/100)")
        print(f"   Processing time: {result['processing_time_ms']}ms")

        if 'demo_mode' in result:
            print(f"\n⚠️  WARNING: Still in demo mode!")
            return False
        else:
            print(f"\n🎉 Real analysis working!")
            return True

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
