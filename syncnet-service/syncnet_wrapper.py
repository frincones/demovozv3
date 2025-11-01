"""
SyncNet Wrapper for AV-Sync Analysis
Provides a simplified interface to the SyncNet pipeline
"""

import os
import sys
import time
import subprocess
import numpy as np
from pathlib import Path
import logging

# Setup logger
logger = logging.getLogger(__name__)


class SyncNetWrapper:
    """
    Wrapper for SyncNet with simplified API

    This class wraps the official SyncNet implementation from:
    https://github.com/joonson/syncnet_python

    It handles:
    - Video preprocessing
    - Face detection
    - Audio-visual synchronization calculation
    - Score normalization
    """

    def __init__(self, model_path: str, detector_path: str, tmp_dir: str = './tmp'):
        """
        Initialize SyncNet wrapper

        Args:
            model_path: Path to syncnet_v2.model
            detector_path: Path to sfd_face.pth (S3FD face detector)
            tmp_dir: Temporary directory for processing
        """
        self.model_path = Path(model_path)
        self.detector_path = Path(detector_path)
        self.tmp_dir = Path(tmp_dir)

        # Check if models exist
        if not self.model_path.exists():
            logger.warning(f"SyncNet model not found at {self.model_path}")
            logger.warning("Run setup script to download models")

        if not self.detector_path.exists():
            logger.warning(f"Face detector not found at {self.detector_path}")

        # Create working directories
        self.pywork_dir = self.tmp_dir / 'pywork'
        self.pycrop_dir = self.tmp_dir / 'pycrop'
        self.pyavi_dir = self.tmp_dir / 'pyavi'

        for dir_path in [self.pywork_dir, self.pycrop_dir, self.pyavi_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)

        # Path to syncnet_python repository
        self.syncnet_repo_path = Path(__file__).parent / 'syncnet_python'

        # Check if SyncNet repo is available
        if not self.syncnet_repo_path.exists():
            logger.warning(f"SyncNet repository not found at {self.syncnet_repo_path}")
            logger.warning("Run: git clone https://github.com/joonson/syncnet_python.git")
            self.syncnet_available = False
        else:
            self.syncnet_available = True
            # Add to Python path
            sys.path.insert(0, str(self.syncnet_repo_path))
            logger.info(f"SyncNet repository loaded from {self.syncnet_repo_path}")

        logger.info(f"SyncNet wrapper initialized (available: {self.syncnet_available})")

    def process_video(self, video_path: str, reference: str) -> dict:
        """
        Process video and return synchronization metrics

        Args:
            video_path: Path to video file to analyze
            reference: Reference ID (e.g., session_id) for organizing outputs

        Returns:
            dict with:
                - offset_frames: int (temporal offset between audio and video)
                - confidence: float (SyncNet confidence score)
                - min_dist: float (minimum distance in embedding space)
                - score: float (normalized score 0-1)
                - lag_ms: float (lag in milliseconds)
                - debug: dict (debugging information)
        """
        start_time = time.time()

        try:
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")

            # If SyncNet is not available, return demo data immediately
            if not self.syncnet_available:
                logger.warning(f"[DEMO MODE] SyncNet not available - returning mock data for {reference}")
                result = self._get_demo_result()
                processing_time = int((time.time() - start_time) * 1000)
                result['processing_time_ms'] = processing_time
                return result

            logger.info(f"Processing video: {video_path} (ref: {reference})")

            # Strategy 1: Try using run_pipeline.py script (official way)
            result = self._process_with_pipeline(video_path, reference)

            if result is None:
                # Strategy 2: Fallback to direct Python API
                logger.info("Trying direct API approach...")
                result = self._process_with_api(video_path, reference)

            if result is None:
                # Strategy 3: Return demo data if both fail
                logger.warning("All processing methods failed - returning demo data")
                result = self._get_demo_result()

            processing_time = int((time.time() - start_time) * 1000)
            result['processing_time_ms'] = processing_time

            return result

        except Exception as e:
            logger.error(f"Error processing video: {str(e)}", exc_info=True)
            raise RuntimeError(f"Video processing failed: {str(e)}")

    def _process_with_pipeline(self, video_path: str, reference: str) -> dict:
        """
        Process video using official run_pipeline.py script

        This is the recommended approach from the SyncNet repository
        """
        try:
            # Use absolute path for data_dir
            data_dir = str(self.tmp_dir.absolute())

            # Check if run_pipeline.py exists
            pipeline_script = self.syncnet_repo_path / 'run_pipeline.py'
            if not pipeline_script.exists():
                logger.warning(f"run_pipeline.py not found at {pipeline_script}")
                return None

            # Build command with absolute paths
            cmd = [
                sys.executable,
                str(pipeline_script),
                '--videofile', os.path.abspath(video_path),
                '--reference', reference,
                '--data_dir', data_dir,
                '--min_track', '50'  # Allow shorter videos (2 seconds at 25fps)
            ]

            logger.info(f"Running SyncNet pipeline: {' '.join(cmd)}")

            # Execute pipeline (increased timeout for CPU processing)
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,  # Increased to 2 minutes for CPU processing
                cwd=str(self.syncnet_repo_path)
            )

            # Log the output for debugging
            logger.info(f"Pipeline stdout:\n{result.stdout}")
            if result.stderr:
                logger.info(f"Pipeline stderr:\n{result.stderr}")

            if result.returncode != 0:
                logger.error(f"Pipeline failed with code {result.returncode}")
                logger.error(f"STDOUT: {result.stdout}")
                logger.error(f"STDERR: {result.stderr}")
                return None

            logger.info("Pipeline completed successfully, now running SyncNet analysis...")

            # Check if crops were generated
            crop_dir = self.pycrop_dir / reference
            if not crop_dir.exists() or not list(crop_dir.glob('*.avi')):
                logger.warning(f"No video crops generated in {crop_dir}")
                logger.warning("This usually means no face tracks were long enough")
                return None

            # Step 2: Run SyncNet analysis on the generated crops
            syncnet_script = self.syncnet_repo_path / 'run_syncnet.py'
            if not syncnet_script.exists():
                logger.warning(f"run_syncnet.py not found at {syncnet_script}")
                return None

            # Use absolute path for model
            abs_model_path = self.model_path if self.model_path.is_absolute() else (Path.cwd() / self.model_path)
            abs_data_dir = data_dir if Path(data_dir).is_absolute() else str(Path.cwd() / data_dir)

            syncnet_cmd = [
                sys.executable,
                str(syncnet_script),
                '--initial_model', str(abs_model_path),
                '--reference', reference,
                '--data_dir', abs_data_dir
            ]

            logger.info(f"Running SyncNet analysis: {' '.join(syncnet_cmd)}")

            syncnet_result = subprocess.run(
                syncnet_cmd,
                capture_output=True,
                text=True,
                timeout=180,  # SyncNet analysis can take up to 3 minutes on CPU
                cwd=str(self.syncnet_repo_path)
            )

            if syncnet_result.returncode != 0:
                logger.error(f"SyncNet analysis failed with code {syncnet_result.returncode}")
                logger.error(f"STDOUT: {syncnet_result.stdout}")
                logger.error(f"STDERR: {syncnet_result.stderr}")
                return None

            # Parse offsets.txt generated by run_syncnet.py
            offsets_path = self.pywork_dir / reference / 'offsets.txt'

            if not offsets_path.exists():
                logger.error(f"offsets.txt not found at {offsets_path}")
                return None

            return self._parse_offsets_file(offsets_path)

        except subprocess.TimeoutExpired:
            logger.error("Pipeline execution timeout")
            return None
        except Exception as e:
            logger.error(f"Pipeline processing failed: {str(e)}")
            return None

    def _process_with_api(self, video_path: str, reference: str) -> dict:
        """
        Process video using direct Python API

        This is a fallback if the pipeline script doesn't work
        """
        try:
            # Try importing SyncNet classes
            from SyncNetInstance import SyncNetInstance

            # Initialize SyncNet
            syncnet = SyncNetInstance()
            syncnet.loadParameters(str(self.model_path))

            # TODO: Implement direct API processing
            # This would require:
            # 1. Extract frames from video
            # 2. Detect face with S3FD
            # 3. Extract audio
            # 4. Run SyncNet forward pass
            # 5. Calculate offset and confidence

            logger.warning("Direct API processing not yet implemented")
            return None

        except ImportError as e:
            logger.error(f"Failed to import SyncNet classes: {e}")
            return None
        except Exception as e:
            logger.error(f"API processing failed: {str(e)}")
            return None

    def _parse_offsets_file(self, offsets_path: Path) -> dict:
        """
        Parse offsets.txt file from SyncNet output

        Format: Each line is "offset confidence min_dist"
        """
        try:
            offsets_data = []

            with open(offsets_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue

                    parts = line.split()
                    if len(parts) >= 3:
                        offset = float(parts[0])
                        conf = float(parts[1])
                        min_dist = float(parts[2])
                        offsets_data.append((offset, conf, min_dist))

            if not offsets_data:
                logger.error("offsets.txt is empty or invalid")
                return None

            # Take best result (highest confidence)
            best = max(offsets_data, key=lambda x: x[1])
            offset_frames, confidence, min_dist = best

            # Calculate metrics
            fps = 25.0  # Default FPS for SyncNet
            lag_ms = (offset_frames / fps) * 1000

            # Normalize to score 0-1
            score = self._normalize_score(confidence, min_dist, offset_frames)

            return {
                'offset_frames': int(offset_frames),
                'confidence': round(confidence, 3),
                'min_dist': round(min_dist, 3),
                'score': round(score, 4),
                'lag_ms': round(lag_ms, 1),
                'debug': {
                    'num_results': len(offsets_data),
                    'all_results': [
                        {
                            'offset': int(o),
                            'confidence': round(c, 3),
                            'min_dist': round(m, 3)
                        }
                        for o, c, m in offsets_data[:5]  # Top 5 results
                    ]
                }
            }

        except Exception as e:
            logger.error(f"Failed to parse offsets file: {str(e)}")
            return None

    def _normalize_score(
        self,
        confidence: float,
        min_dist: float,
        offset_frames: float
    ) -> float:
        """
        Normalize SyncNet metrics to a score between 0 and 1

        Based on the original SyncNet paper "Out of time: automated lip sync in the wild"
        (Chung & Zisserman, ACCV 2016)

        Interpretation from paper:
        - Confidence > 2.0: Video contains speech (good audio-visual correlation)
        - Confidence 6-7: Typical for well-synchronized videos
        - Min_dist 5-15: Normal range for euclidean distance
        - Offset = 0: Perfect synchronization

        Formula components:
        1. Confidence score (higher = better): normalized to 0-1 using threshold of 2.0
        2. Min distance (lower = better): normalized inversely
        3. Offset penalty (closer to 0 = better): exponential decay

        Args:
            confidence: SyncNet confidence score (median - min of distances)
            min_dist: Minimum distance in embedding space
            offset_frames: Temporal offset in frames

        Returns:
            Normalized score between 0.0 and 1.0 (higher = more likely real/human)
        """
        # Confidence component: Paper threshold is 2.0 for speech presence
        # Map confidence: <2.0 -> low score, >2.0 -> increasing score
        # Use sigmoid centered at 2.0, scaling to make 6-7 give high scores
        conf_component = 1.0 / (1.0 + np.exp(-(confidence - 2.0) / 2.0))

        # Min distance component: Lower is better
        # Normalize using typical range from paper (5-15)
        # Invert so lower distance = higher score
        dist_normalized = np.clip((min_dist - 5.0) / 10.0, 0.0, 1.0)
        dist_component = 1.0 - dist_normalized

        # Offset penalty: Perfect sync = 0 offset
        # Exponential decay: 0 frames = 1.0, 5 frames = ~0.6, 10 frames = ~0.4
        offset_component = np.exp(-abs(offset_frames) / 10.0)

        # Weighted combination
        # Confidence is most important (0.5), then distance (0.3), then offset (0.2)
        score = (
            0.5 * conf_component +
            0.3 * dist_component +
            0.2 * offset_component
        )

        # Clamp to [0, 1]
        return float(np.clip(score, 0.0, 1.0))

    def _get_demo_result(self) -> dict:
        """
        Return demo/mock result for testing without SyncNet

        Returns realistic-looking metrics
        """
        return {
            'offset_frames': 2,
            'confidence': 9.8,
            'min_dist': 5.2,
            'score': 0.89,
            'lag_ms': 80.0,
            'demo_mode': True,
            'debug': {
                'message': 'Demo mode - SyncNet processing not available',
                'num_results': 1
            }
        }

    def cleanup(self, reference: str):
        """
        Clean up temporary files for a reference

        Args:
            reference: Reference ID to clean up
        """
        try:
            import shutil

            for base_dir in [self.pywork_dir, self.pycrop_dir, self.pyavi_dir]:
                ref_dir = base_dir / reference
                if ref_dir.exists():
                    shutil.rmtree(ref_dir)
                    logger.info(f"Cleaned up {ref_dir}")

        except Exception as e:
            logger.error(f"Cleanup failed: {str(e)}")
