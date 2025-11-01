#!/usr/bin/env python3
"""Debug script to analyze SyncNet pipeline pickle files"""

import pickle
import sys
import numpy as np

def analyze_pickle_files(reference):
    base_path = f'/workspaces/demovozv3/syncnet-service/tmp/pywork/{reference}'

    print(f"=== Analyzing {reference} ===\n")

    # Load faces
    try:
        with open(f'{base_path}/faces.pckl', 'rb') as f:
            faces = pickle.load(f)
        print(f"✓ Faces loaded: {len(faces)} frames")

        # Count total detections
        total_dets = sum(len(frame_faces) for frame_faces in faces)
        print(f"  Total face detections: {total_dets}")

        # Analyze first few frames with faces
        frames_with_faces = [(i, frame_faces) for i, frame_faces in enumerate(faces) if len(frame_faces) > 0]
        print(f"  Frames with faces: {len(frames_with_faces)}")

        if frames_with_faces:
            # Show first detection details
            first_frame_idx, first_frame_faces = frames_with_faces[0]
            first_face = first_frame_faces[0]
            bbox = first_face['bbox']
            face_width = bbox[2] - bbox[0]
            face_height = bbox[3] - bbox[1]
            face_size = max(face_width, face_height)

            print(f"\n  First face detection (frame {first_frame_idx}):")
            print(f"    BBox: {bbox}")
            print(f"    Width: {face_width:.1f}px, Height: {face_height:.1f}px")
            print(f"    Max dimension: {face_size:.1f}px")
            print(f"    Confidence: {first_face['conf']:.3f}")

            # Check all face sizes
            all_sizes = []
            for frame_idx, frame_faces in frames_with_faces:
                for face in frame_faces:
                    bbox = face['bbox']
                    size = max(bbox[2] - bbox[0], bbox[3] - bbox[1])
                    all_sizes.append(size)

            if all_sizes:
                print(f"\n  Face size statistics:")
                print(f"    Min: {min(all_sizes):.1f}px")
                print(f"    Max: {max(all_sizes):.1f}px")
                print(f"    Mean: {np.mean(all_sizes):.1f}px")
                print(f"    Median: {np.median(all_sizes):.1f}px")
    except Exception as e:
        print(f"✗ Error loading faces: {e}")

    # Load scenes
    try:
        with open(f'{base_path}/scene.pckl', 'rb') as f:
            scenes = pickle.load(f)
        print(f"\n✓ Scenes loaded: {len(scenes)} scene(s)")

        for i, scene in enumerate(scenes):
            start_frame = scene[0].frame_num
            end_frame = scene[1].frame_num
            duration = end_frame - start_frame
            print(f"  Scene {i}: frames {start_frame}-{end_frame} (duration: {duration} frames, {duration/25:.1f}s)")
    except Exception as e:
        print(f"\n✗ Error loading scenes: {e}")

    # Load tracks
    try:
        with open(f'{base_path}/tracks.pckl', 'rb') as f:
            tracks = pickle.load(f)
        print(f"\n✓ Tracks loaded: {len(tracks)} track(s)")

        if len(tracks) == 0:
            print("  ⚠ NO TRACKS GENERATED - This is the problem!")
            print("\n  Possible reasons:")
            print("    1. Track duration check: len(track) > min_track (needs to be > not >=)")
            print("    2. Face size too small: must be > 100px")
            print("    3. Face tracking failed to link detections")
    except Exception as e:
        print(f"\n✗ Error loading tracks: {e}")

if __name__ == '__main__':
    reference = sys.argv[1] if len(sys.argv) > 1 else 'complete_test'
    analyze_pickle_files(reference)
