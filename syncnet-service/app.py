"""
Flask server for AV-Sync analysis using Ensemble (SyncNet + EfficientNet + ViT v2)
Provides REST API for deepfake detection via audio-visual synchronization
UPDATED: 2025-11-03 - Integrated EfficientNet Detector + Vision Transformer v2
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
import time
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# [NUEVO] Import Ensemble Orchestrator
try:
    from ensemble.orchestrator import EnsembleOrchestrator
    from ensemble.efficientnet_detector import EfficientNetDetector
    from ensemble.vit_detector import ViTDetector
    ENSEMBLE_AVAILABLE = True
    VIT_AVAILABLE = True
except ImportError as e:
    ENSEMBLE_AVAILABLE = False
    VIT_AVAILABLE = False
    logging.warning(f"Ensemble not available - running in legacy mode: {e}")

# [EXISTENTE] Import SyncNet wrapper
try:
    from syncnet_wrapper import SyncNetWrapper
    SYNCNET_AVAILABLE = True
except ImportError:
    SYNCNET_AVAILABLE = False
    logging.warning("SyncNet wrapper not available - running in demo mode")

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Get absolute paths for models
BASE_DIR = Path(__file__).parent.absolute()

# [ACTUALIZADO] Configuration
CONFIG = {
    # SyncNet (existente)
    'syncnet_enabled': os.getenv('SYNCNET_ENABLED', 'true').lower() == 'true',
    'model_path': os.getenv('MODEL_PATH', str(BASE_DIR / 'models' / 'syncnet_v2.model')),
    'detector_path': os.getenv('DETECTOR_PATH', str(BASE_DIR / 'models' / 'sfd_face.pth')),
    'tmp_dir': os.getenv('TMP_DIR', str(BASE_DIR / 'tmp')),
    'upload_dir': os.getenv('UPLOAD_DIR', str(BASE_DIR / 'tmp' / 'uploads')),
    'max_video_size_mb': int(os.getenv('MAX_VIDEO_SIZE_MB', '10')),
    'processing_timeout': int(os.getenv('PROCESSING_TIMEOUT_SECONDS', '30')),

    # [NUEVO] EfficientNet configuration
    'efficientnet_enabled': os.getenv('EFFICIENTNET_ENABLED', 'false').lower() == 'true',
    'efficientnet_model_path': os.getenv(
        'EFFICIENTNET_MODEL_PATH',
        str(BASE_DIR / 'models' / 'efficientnet' / 'best_model-v3.pt')
    ),
    'efficientnet_device': os.getenv('EFFICIENTNET_DEVICE', 'cpu'),
    'efficientnet_max_frames': int(os.getenv('EFFICIENTNET_MAX_FRAMES', '20')),

    # [NUEVO] ViT v2 configuration
    'vit_enabled': os.getenv('VIT_ENABLED', 'true').lower() == 'true',
    'vit_model_name': os.getenv('VIT_MODEL_NAME', 'prithivMLmods/Deep-Fake-Detector-v2-Model'),
    'vit_device': os.getenv('VIT_DEVICE', 'cpu'),
    'vit_max_frames': int(os.getenv('VIT_MAX_FRAMES', '20')),

    # [NUEVO] Ensemble weights (updated for 3 detectors)
    'ensemble_weight_syncnet': float(os.getenv('ENSEMBLE_WEIGHT_SYNCNET', '0.3')),
    'ensemble_weight_efficientnet': float(os.getenv('ENSEMBLE_WEIGHT_EFFICIENTNET', '0.0')),
    'ensemble_weight_vit': float(os.getenv('ENSEMBLE_WEIGHT_VIT', '0.7')),
}

# [NUEVO] Initialize Ensemble Orchestrator (lazy loading)
ensemble_orchestrator = None

def get_ensemble():
    """Lazy initialization of Ensemble Orchestrator"""
    global ensemble_orchestrator

    if ensemble_orchestrator is None:
        try:
            logger.info("[App] Initializing Ensemble Orchestrator...")

            # Initialize SyncNet (if enabled)
            syncnet = None
            if CONFIG['syncnet_enabled'] and SYNCNET_AVAILABLE:
                syncnet = SyncNetWrapper(
                    model_path=CONFIG['model_path'],
                    detector_path=CONFIG['detector_path'],
                    tmp_dir=CONFIG['tmp_dir']
                )
                logger.info("[App] SyncNet initialized ✓")
            else:
                logger.info("[App] SyncNet disabled or not available ✗")

            # Initialize EfficientNet (if enabled)
            efficientnet = None
            if CONFIG['efficientnet_enabled'] and ENSEMBLE_AVAILABLE:
                efficientnet = EfficientNetDetector(
                    model_path=CONFIG['efficientnet_model_path'],
                    device=CONFIG['efficientnet_device']
                )
                logger.info("[App] EfficientNet initialized ✓")
            else:
                logger.info("[App] EfficientNet disabled or not available ✗")

            # Initialize ViT v2 (if enabled)
            vit = None
            if CONFIG['vit_enabled'] and VIT_AVAILABLE:
                logger.info("[App] Initializing ViT v2 (this may take a moment to download the model)...")
                vit = ViTDetector(
                    model_name=CONFIG['vit_model_name'],
                    device=CONFIG['vit_device']
                )
                logger.info("[App] ViT v2 initialized ✓")
            else:
                logger.info("[App] ViT v2 disabled or not available ✗")

            # Create orchestrator with all 3 detectors
            ensemble_orchestrator = EnsembleOrchestrator(
                syncnet_wrapper=syncnet,
                efficientnet_detector=efficientnet,
                vit_detector=vit,
                weights={
                    'syncnet': CONFIG['ensemble_weight_syncnet'],
                    'efficientnet': CONFIG['ensemble_weight_efficientnet'],
                    'vit': CONFIG['ensemble_weight_vit']
                }
            )

            logger.info("[App] Ensemble Orchestrator initialized successfully")

        except Exception as e:
            logger.error(f"[App] Failed to initialize Ensemble: {str(e)}")
            return None

    return ensemble_orchestrator


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    ensemble = get_ensemble()

    return jsonify({
        'status': 'healthy',
        'service': 'deepfake-detection-ensemble',
        'version': '3.0.0',  # [ACTUALIZADO] Versión - Added ViT v2
        'detectors': {
            'syncnet': {
                'enabled': CONFIG['syncnet_enabled'],
                'available': SYNCNET_AVAILABLE and CONFIG['syncnet_enabled']
            },
            'efficientnet': {
                'enabled': CONFIG['efficientnet_enabled'],
                'available': CONFIG['efficientnet_enabled'] and ENSEMBLE_AVAILABLE
            },
            'vit_v2': {
                'enabled': CONFIG['vit_enabled'],
                'available': CONFIG['vit_enabled'] and VIT_AVAILABLE,
                'model': CONFIG['vit_model_name']
            }
        },
        'ensemble_available': ensemble is not None,
        'config': {
            'max_video_size_mb': CONFIG['max_video_size_mb'],
            'processing_timeout': CONFIG['processing_timeout'],
            'efficientnet_max_frames': CONFIG['efficientnet_max_frames'],
        }
    })


@app.route('/score', methods=['POST'])
def score_video():
    """
    Analyze video using Ensemble (SyncNet + EfficientNet)

    [MODIFICADO] Ahora usa EnsembleOrchestrator en lugar de solo SyncNet
    [COMPATIBLE] Mantiene la misma API request/response

    Request JSON:
    {
        "video_path": "/tmp/uploads/abc123.webm",
        "session_id": "sess_xyz"
    }

    Response JSON: Compatible con anterior + nuevos campos
    """
    start_time = time.time()

    try:
        # Parse request
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400

        video_path = data.get('video_path')
        session_id = data.get('session_id', 'unknown')

        # Validate
        if not video_path:
            return jsonify({'error': 'video_path is required'}), 400

        if not os.path.exists(video_path):
            return jsonify({'error': f'Video file not found: {video_path}'}), 404

        # Check file size
        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        if file_size_mb > CONFIG['max_video_size_mb']:
            return jsonify({
                'error': f'Video file too large: {file_size_mb:.2f} MB (max: {CONFIG["max_video_size_mb"]} MB)'
            }), 400

        logger.info(f'[{session_id}] Processing video: {video_path} ({file_size_mb:.2f} MB)')

        # [MODIFICADO] Get Ensemble Orchestrator
        ensemble = get_ensemble()

        if ensemble is None:
            # [FALLBACK] Demo mode
            logger.warning(f'[{session_id}] Ensemble not available - returning demo data')
            return jsonify({
                'offset_frames': 2,
                'confidence': 9.5,
                'min_dist': 5.8,
                'score': 0.88,
                'combined_score': 0.88,
                'lag_ms': 80.0,
                'decision': 'ALLOW',
                'processing_time_ms': 1000,
                'demo_mode': True,
                'debug': {
                    'message': 'Ensemble not initialized - demo mode active'
                }
            })

        # [NUEVO] Process video with Ensemble
        try:
            result = ensemble.analyze_video(video_path, session_id)

            processing_time_ms = int((time.time() - start_time) * 1000)
            result['processing_time_ms'] = processing_time_ms

            logger.info(
                f'[{session_id}] Result: score={result["combined_score"]:.3f}, '
                f'decision={result["decision"]}, time={processing_time_ms}ms'
            )

            return jsonify(result)

        except TimeoutError:
            logger.error(f'[{session_id}] Processing timeout')
            return jsonify({
                'error': 'Processing timeout',
                'message': f'Video processing exceeded {CONFIG["processing_timeout"]}s limit'
            }), 408

    except Exception as e:
        logger.error(f'Error processing video: {str(e)}', exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e),
            'type': type(e).__name__
        }), 500


@app.route('/test', methods=['GET'])
def test():
    """Test endpoint to verify server is running"""
    return jsonify({
        'message': 'SyncNet service is running',
        'timestamp': time.time(),
        'config': CONFIG
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f'Internal server error: {str(error)}')
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'

    logger.info(f"Starting Ensemble Deepfake Detection Service on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"SyncNet enabled: {CONFIG['syncnet_enabled']}")
    logger.info(f"SyncNet model: {CONFIG['model_path']}")
    logger.info(f"EfficientNet enabled: {CONFIG['efficientnet_enabled']}")
    logger.info(f"EfficientNet model: {CONFIG['efficientnet_model_path']}")
    logger.info(f"Temp directory: {CONFIG['tmp_dir']}")

    # Ensure directories exist
    Path(CONFIG['tmp_dir']).mkdir(parents=True, exist_ok=True)
    Path(CONFIG['upload_dir']).mkdir(parents=True, exist_ok=True)

    app.run(host='0.0.0.0', port=port, debug=debug)
