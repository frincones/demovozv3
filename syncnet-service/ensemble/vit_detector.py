"""
Vision Transformer v2 Deepfake Detector
Model: prithivMLmods/Deep-Fake-Detector-v2-Model
Accuracy: 92.12% (96.83% precision on Real, 88.26% on Deepfake)
Integrated: 2025-11-03
"""

import torch
from transformers import ViTForImageClassification, ViTImageProcessor
from PIL import Image
import numpy as np
import logging
from typing import Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class ViTDetector:
    """
    Vision Transformer v2 Deepfake Detector

    Uses google/vit-base-patch16-224-in21k fine-tuned on deepfake detection
    Achieves 92.12% accuracy with F1-score of 0.9249
    """

    def __init__(
        self,
        model_name: str = "prithivMLmods/Deep-Fake-Detector-v2-Model",
        device: str = 'cpu',
        confidence_threshold: float = 0.5
    ):
        """
        Initialize ViT Detector

        Args:
            model_name: Hugging Face model name
            device: 'cuda' or 'cpu'
            confidence_threshold: Threshold for binary classification
        """
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.confidence_threshold = confidence_threshold
        self.model_name = model_name

        logger.info(f"[ViT] Initializing Vision Transformer v2 on device: {self.device}")
        logger.info(f"[ViT] Loading model: {model_name}")

        try:
            # Load model and processor from Hugging Face
            self.model = ViTForImageClassification.from_pretrained(
                model_name,
                torch_dtype=torch.float32,
                low_cpu_mem_usage=True
            )
            self.processor = ViTImageProcessor.from_pretrained(model_name)

            # Move to device and set eval mode
            self.model.to(self.device)
            self.model.eval()

            logger.info("[ViT] Model loaded successfully")
            logger.info(f"[ViT] Model size: {sum(p.numel() for p in self.model.parameters())/1e6:.2f}M parameters")

        except Exception as e:
            logger.error(f"[ViT] Failed to load model: {e}")
            raise RuntimeError(f"Failed to load ViT model: {e}")

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
                probabilities: dict - Class probabilities
                class_label: str - "Realism" or "Deepfake"
        """
        with torch.no_grad():
            # Preprocess image
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}

            # Forward pass
            outputs = self.model(**inputs)
            logits = outputs.logits

            # Get probabilities
            probabilities = torch.softmax(logits, dim=-1)[0]

            # Get predicted class
            predicted_class_idx = logits.argmax(-1).item()

            # Model has 2 classes: 0="Realism", 1="Deepfake"
            # Verified from model.config.id2label
            class_labels = self.model.config.id2label
            predicted_label = class_labels[predicted_class_idx]

            # Extract probabilities
            # IMPORTANT: Class 0 = "Realism" (Real), Class 1 = "Deepfake" (Fake)
            real_prob = probabilities[0].item()  # Probability of REAL
            fake_prob = probabilities[1].item()  # Probability of FAKE

            # Classification decision
            is_real = predicted_label == "Realism"
            confidence = max(real_prob, fake_prob)

            return {
                'is_real': is_real,
                'confidence': confidence,
                'score': real_prob,  # Higher = more likely real
                'probabilities': {
                    'real': real_prob,
                    'fake': fake_prob
                },
                'class_label': predicted_label
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

        logger.info(f"[ViT] Analyzing {len(frames)} frames")

        predictions = []
        for idx, frame in enumerate(frames):
            try:
                pred = self.predict_image(frame)
                predictions.append(pred)
            except Exception as e:
                logger.error(f"[ViT] Error processing frame {idx}: {e}")
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
            'aggregate_method': aggregate_method,
            'model': 'vit-v2'
        }

    def __repr__(self):
        return (
            f"ViTDetector("
            f"model={self.model_name}, "
            f"device={self.device}, "
            f"threshold={self.confidence_threshold})"
        )
