"""
Video Frame Extraction Utilities
Extrae frames de videos para análisis con EfficientNet
"""

import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class FrameExtractor:
    """
    Extract frames from video files

    Supports uniform sampling, random sampling, and key frame extraction
    """

    def __init__(
        self,
        max_frames: int = 20,
        sampling_method: str = 'uniform'
    ):
        """
        Initialize frame extractor

        Args:
            max_frames: Maximum number of frames to extract
            sampling_method: 'uniform', 'random', 'keyframes'
        """
        self.max_frames = max_frames
        self.sampling_method = sampling_method

        logger.info(
            f"[FrameExtractor] Initialized "
            f"(max_frames={max_frames}, method={sampling_method})"
        )

    def extract_frames(
        self,
        video_path: str,
        resize: Optional[tuple] = None
    ) -> List[Image.Image]:
        """
        Extract frames from video

        Args:
            video_path: Path to video file
            resize: Optional (width, height) to resize frames

        Returns:
            List of PIL Images (RGB)
        """
        video_path = Path(video_path)

        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        # Open video
        cap = cv2.VideoCapture(str(video_path))

        if not cap.isOpened():
            raise RuntimeError(f"Failed to open video: {video_path}")

        # Get video properties
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Validate metadata (WebM videos sometimes have corrupted frame count)
        if total_frames <= 0 or total_frames > 1000000:
            logger.warning(
                f"[FrameExtractor] Invalid frame count ({total_frames}), "
                f"will read frames sequentially"
            )
            use_sequential_mode = True
            total_frames = None  # Unknown
        else:
            use_sequential_mode = False

        logger.info(
            f"[FrameExtractor] Video: {total_frames if total_frames else 'unknown'} frames "
            f"@ {fps:.2f} FPS ({width}x{height})"
        )

        # Extract frames
        frames = []

        if use_sequential_mode:
            # Sequential mode: read all frames and sample uniformly
            logger.info("[FrameExtractor] Using sequential mode for corrupted metadata")

            all_frames = []
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                all_frames.append(frame)

            cap.release()

            if not all_frames:
                raise RuntimeError("No frames could be read from video")

            # Sample uniformly from all frames
            step = max(1, len(all_frames) // self.max_frames)
            sampled_indices = list(range(0, len(all_frames), step))[:self.max_frames]

            for idx in sampled_indices:
                frame = all_frames[idx]
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                # Convert to PIL Image
                pil_image = Image.fromarray(frame_rgb)
                if resize:
                    pil_image = pil_image.resize(resize, Image.BICUBIC)
                frames.append(pil_image)

            logger.info(f"[FrameExtractor] Read {len(all_frames)} total frames, sampled {len(frames)}")

        else:
            # Normal mode: use frame indices
            if self.sampling_method == 'uniform':
                frame_indices = self._get_uniform_indices(total_frames)
            elif self.sampling_method == 'random':
                frame_indices = self._get_random_indices(total_frames)
            elif self.sampling_method == 'keyframes':
                frame_indices = self._get_keyframe_indices(cap, total_frames)
            else:
                raise ValueError(f"Unknown sampling method: {self.sampling_method}")

            current_frame = 0
            while cap.isOpened() and len(frames) < self.max_frames:
                ret, frame = cap.read()

                if not ret:
                    break

                if current_frame in frame_indices:
                    # Convert BGR to RGB
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    # Convert to PIL Image
                    pil_image = Image.fromarray(frame_rgb)
                    # Optional resize
                    if resize:
                        pil_image = pil_image.resize(resize, Image.BICUBIC)
                    frames.append(pil_image)

                current_frame += 1

            cap.release()

        logger.info(f"[FrameExtractor] Extracted {len(frames)} frames")

        if not frames:
            raise RuntimeError("No frames extracted from video")

        return frames

    def _get_uniform_indices(self, total_frames: int) -> List[int]:
        """Get uniformly distributed frame indices"""
        if self.max_frames >= total_frames:
            return list(range(total_frames))

        # Uniform spacing
        step = total_frames / self.max_frames
        indices = [int(i * step) for i in range(self.max_frames)]

        return indices

    def _get_random_indices(self, total_frames: int) -> List[int]:
        """Get random frame indices"""
        if self.max_frames >= total_frames:
            return list(range(total_frames))

        indices = np.random.choice(
            total_frames,
            size=self.max_frames,
            replace=False
        )

        return sorted(indices.tolist())

    def _get_keyframe_indices(
        self,
        cap: cv2.VideoCapture,
        total_frames: int
    ) -> List[int]:
        """
        Get key frame indices (scene changes, high motion)

        Simplified implementation using frame difference
        """
        # For now, fallback to uniform sampling
        # TODO: Implement proper keyframe detection using scene change detection
        logger.warning(
            "[FrameExtractor] Keyframe detection not implemented, "
            "using uniform sampling"
        )
        return self._get_uniform_indices(total_frames)
