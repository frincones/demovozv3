"""
EfficientNet Deepfake Detector
Adaptado de: https://github.com/TRahulsingh/DeepfakeDetector
Integrado para trabajar con SyncNet en modo ensemble
"""

import torch
import torch.nn as nn
from torchvision.models import efficientnet_b0
from torchvision import transforms
from PIL import Image
import numpy as np
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class EfficientNetDetector:
    """
    Deepfake detector using EfficientNet-B0

    Compatible con el repositorio TRahulsingh/DeepfakeDetector
    Adaptado para integración con SyncNet
    """

    def __init__(
        self,
        model_path: str,
        device: str = 'cpu',
        confidence_threshold: float = 0.5
    ):
        """
        Initialize EfficientNet detector

        Args:
            model_path: Path to pre-trained model weights (.pt file)
            device: 'cuda' or 'cpu'
            confidence_threshold: Threshold for binary classification
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.confidence_threshold = confidence_threshold

        logger.info(f"[EfficientNet] Initializing on device: {self.device}")

        # Build model architecture
        self.model = self._build_model()

        # Load pre-trained weights
        self._load_weights(model_path)

        # Set to evaluation mode
        self.model.to(self.device)
        self.model.eval()

        # Image preprocessing pipeline
        # Matches ImageNet normalization (used in pre-training)
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],  # ImageNet means
                std=[0.229, 0.224, 0.225]    # ImageNet stds
            )
        ])

        logger.info("[EfficientNet] Detector initialized successfully")

    def _build_model(self) -> nn.Module:
        """
        Build EfficientNet-B0 architecture with custom classifier

        Architecture matches TRahulsingh/DeepfakeDetector:
        - Base: EfficientNet-B0 (pretrained on ImageNet)
        - Classifier: Linear(num_features -> 2)
        - Output: 2 classes (Real, Deepfake)
        """
        # Load pre-trained EfficientNet-B0
        model = efficientnet_b0(pretrained=True)

        # Replace final classifier for binary classification
        # web-app.py shows: classifier[1] = Linear(in_features, 2)
        num_features = model.classifier[1].in_features
        model.classifier[1] = nn.Linear(num_features, 2)

        logger.info(f"[EfficientNet] Model architecture built (input features: {num_features})")
        return model

    def _load_weights(self, model_path: str):
        """Load pre-trained weights from file"""
        model_path = Path(model_path)

        if not model_path.exists():
            logger.warning(f"[EfficientNet] Model file not found: {model_path}")
            logger.warning("[EfficientNet] Using randomly initialized weights (NOT RECOMMENDED)")
            return

        try:
            # Load checkpoint
            state_dict = torch.load(model_path, map_location=self.device)

            # Load state dict
            self.model.load_state_dict(state_dict, strict=True)
            logger.info(f"[EfficientNet] Loaded weights from {model_path}")

        except Exception as e:
            logger.error(f"[EfficientNet] Failed to load weights: {e}")
            raise RuntimeError(f"Failed to load model weights: {e}")

    def predict_image(self, image: Image.Image) -> Dict[str, Union[bool, float, dict]]:
        """
        Predict if a single image is real or fake

        Args:
            image: PIL Image (RGB)

        Returns:
            dict:
                is_real: bool - True if classified as Real
                confidence: float - Confidence in prediction (0-1)
                score: float - Score for "Real" class (0-1)
                probabilities: dict - Softmax probabilities
        """
        with torch.no_grad():
            # Preprocess image
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)

            # Forward pass
            outputs = self.model(img_tensor)

            # Apply softmax to get probabilities
            probabilities = torch.softmax(outputs, dim=1)

            # Extract class probabilities
            # IMPORTANT: Model outputs [Fake, Real] - class 0 = Fake, class 1 = Real
            # This matches the FaceForensics++ training convention
            fake_prob = probabilities[0][0].item()  # Probability of FAKE
            real_prob = probabilities[0][1].item()  # Probability of REAL

            # Classification decision
            is_real = real_prob > self.confidence_threshold
            confidence = max(real_prob, fake_prob)

            return {
                'is_real': is_real,
                'confidence': confidence,
                'score': real_prob,  # Higher = more likely real
                'probabilities': {
                    'real': real_prob,
                    'fake': fake_prob
                }
            }

    def predict_frames(
        self,
        frames: List[Image.Image],
        aggregate_method: str = 'mean'
    ) -> Dict[str, Union[bool, float, dict, list]]:
        """
        Predict across multiple frames and aggregate results

        Args:
            frames: List of PIL Images
            aggregate_method: 'mean', 'median', 'max', 'voting'

        Returns:
            dict:
                is_real: bool - Aggregated classification
                score: float - Aggregated score (0-1)
                confidence: float - Average confidence
                consistency: float - Inter-frame consistency (1-std)
                num_frames: int
                frame_scores: list - Individual frame scores
                statistics: dict - Detailed statistics
        """
        if not frames:
            raise ValueError("No frames provided for prediction")

        logger.info(f"[EfficientNet] Analyzing {len(frames)} frames")

        predictions = []
        for idx, frame in enumerate(frames):
            try:
                pred = self.predict_image(frame)
                predictions.append(pred)
            except Exception as e:
                logger.error(f"[EfficientNet] Error processing frame {idx}: {e}")
                continue

        if not predictions:
            raise RuntimeError("Failed to process any frames")

        # Extract scores
        scores = np.array([p['score'] for p in predictions])
        confidences = np.array([p['confidence'] for p in predictions])

        # Aggregate scores
        if aggregate_method == 'mean':
            agg_score = float(np.mean(scores))
        elif aggregate_method == 'median':
            agg_score = float(np.median(scores))
        elif aggregate_method == 'max':
            agg_score = float(np.max(scores))
        elif aggregate_method == 'voting':
            # Majority vote on classifications
            votes = sum([1 if p['is_real'] else 0 for p in predictions])
            agg_score = votes / len(predictions)
        else:
            raise ValueError(f"Unknown aggregate method: {aggregate_method}")

        # Calculate consistency (lower std = more consistent)
        std_score = float(np.std(scores))
        consistency = 1.0 - min(std_score * 2, 1.0)  # Normalize to 0-1

        # Final classification
        is_real = agg_score > self.confidence_threshold
        avg_confidence = float(np.mean(confidences))

        return {
            'is_real': is_real,
            'score': agg_score,
            'confidence': avg_confidence,
            'consistency': consistency,
            'num_frames': len(frames),
            'frame_scores': scores.tolist(),
            'statistics': {
                'mean': float(np.mean(scores)),
                'median': float(np.median(scores)),
                'std': std_score,
                'min': float(np.min(scores)),
                'max': float(np.max(scores)),
                'q25': float(np.percentile(scores, 25)),
                'q75': float(np.percentile(scores, 75))
            },
            'aggregate_method': aggregate_method
        }

    def __repr__(self):
        return (
            f"EfficientNetDetector("
            f"device={self.device}, "
            f"threshold={self.confidence_threshold})"
        )
