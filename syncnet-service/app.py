"""
Flask server for AV-Sync analysis using SyncNet
Provides REST API for deepfake detection via audio-visual synchronization
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

# Import SyncNet wrapper (will be created)
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

# Configuration
CONFIG = {
    'model_path': os.getenv('MODEL_PATH', str(BASE_DIR / 'models' / 'syncnet_v2.model')),
    'detector_path': os.getenv('DETECTOR_PATH', str(BASE_DIR / 'models' / 'sfd_face.pth')),
    'tmp_dir': os.getenv('TMP_DIR', str(BASE_DIR / 'tmp')),
    'upload_dir': os.getenv('UPLOAD_DIR', str(BASE_DIR / 'tmp' / 'uploads')),
    'max_video_size_mb': int(os.getenv('MAX_VIDEO_SIZE_MB', '10')),
    'processing_timeout': int(os.getenv('PROCESSING_TIMEOUT_SECONDS', '30')),
}

# Initialize SyncNet (lazy loading)
syncnet_instance = None

def get_syncnet():
    """Lazy initialization of SyncNet"""
    global syncnet_instance

    if not SYNCNET_AVAILABLE:
        return None

    if syncnet_instance is None:
        try:
            logger.info("Initializing SyncNet...")
            syncnet_instance = SyncNetWrapper(
                model_path=CONFIG['model_path'],
                detector_path=CONFIG['detector_path'],
                tmp_dir=CONFIG['tmp_dir']
            )
            logger.info("SyncNet initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize SyncNet: {str(e)}")
            return None

    return syncnet_instance


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    syncnet = get_syncnet()

    return jsonify({
        'status': 'healthy',
        'service': 'syncnet-avsync',
        'version': '1.0.0',
        'syncnet_available': syncnet is not None,
        'models_loaded': syncnet is not None,
        'config': {
            'max_video_size_mb': CONFIG['max_video_size_mb'],
            'processing_timeout': CONFIG['processing_timeout'],
        }
    })


@app.route('/score', methods=['POST'])
def score_video():
    """
    Analyze audio-visual synchronization of a video

    Request JSON:
    {
        "video_path": "/tmp/uploads/abc123.webm",
        "session_id": "sess_xyz"
    }

    Response JSON:
    {
        "offset_frames": 3,
        "confidence": 10.02,
        "min_dist": 5.35,
        "score": 0.91,
        "lag_ms": 100,
        "processing_time_ms": 7234,
        "debug": {...}
    }
    """
    start_time = time.time()

    try:
        # Parse request
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Request body must be JSON'}), 400

        video_path = data.get('video_path')
        session_id = data.get('session_id', 'unknown')

        # Validate video_path
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

        # Get SyncNet instance
        syncnet = get_syncnet()

        if syncnet is None:
            # Demo mode - return mock data
            logger.warning(f'[{session_id}] SyncNet not available - returning demo data')
            return jsonify({
                'offset_frames': 2,
                'confidence': 9.5,
                'min_dist': 5.8,
                'score': 0.88,
                'lag_ms': 80.0,
                'processing_time_ms': 1000,
                'demo_mode': True,
                'debug': {
                    'message': 'SyncNet not initialized - demo mode active'
                }
            })

        # Process video with SyncNet
        try:
            result = syncnet.process_video(video_path, session_id)

            processing_time_ms = int((time.time() - start_time) * 1000)
            result['processing_time_ms'] = processing_time_ms

            logger.info(
                f'[{session_id}] Result: score={result["score"]:.3f}, '
                f'offset={result["offset_frames"]}, time={processing_time_ms}ms'
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

    logger.info(f"Starting SyncNet service on port {port}")
    logger.info(f"Debug mode: {debug}")
    logger.info(f"Model path: {CONFIG['model_path']}")
    logger.info(f"Temp directory: {CONFIG['tmp_dir']}")

    # Ensure directories exist
    Path(CONFIG['tmp_dir']).mkdir(parents=True, exist_ok=True)
    Path(CONFIG['upload_dir']).mkdir(parents=True, exist_ok=True)

    app.run(host='0.0.0.0', port=port, debug=debug)
