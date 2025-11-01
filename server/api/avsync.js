/**
 * AV-Sync API Route (ES6 Module)
 * Handles video upload and synchronization analysis
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../tmp/uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `video-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    console.log('[AV-Sync Upload] File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
    });

    // Accept video files by mimetype OR by extension
    const isVideoMimetype = file.mimetype.startsWith('video/');
    const isVideoExtension = /\.(webm|mp4|avi|mov)$/i.test(file.originalname);

    if (isVideoMimetype || isVideoExtension) {
      console.log('[AV-Sync Upload] File accepted');
      cb(null, true);
    } else {
      console.error('[AV-Sync Upload] File rejected - not a video file');
      cb(new Error('Only video files are allowed'), false);
    }
  },
});

/**
 * POST /api/avsync/score
 * Analyze audio-visual synchronization of uploaded video
 */
router.post('/score', upload.single('video'), async (req, res) => {
  const { file, body } = req;
  const startTime = Date.now();

  try {
    // Validate request
    if (!file) {
      return res.status(400).json({
        error: 'No video file provided',
        message: 'Please upload a video file'
      });
    }

    const { session_id, user_consent, metadata } = body;

    if (!session_id) {
      return res.status(400).json({
        error: 'session_id is required',
        message: 'Please provide a session_id'
      });
    }

    if (user_consent !== 'true') {
      return res.status(403).json({
        error: 'User consent required',
        message: 'User must consent to video processing'
      });
    }

    // Log request
    console.log('[AVSync] Processing video:', {
      filename: file.filename,
      originalName: file.originalname,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      mimetype: file.mimetype,
      sessionId: session_id,
    });

    // Forward to Python service
    const pythonServiceURL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

    console.log(`[AVSync] Forwarding to Python service: ${pythonServiceURL}`);

    const pythonResponse = await fetch(`${pythonServiceURL}/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_path: file.path,
        session_id: session_id,
      }),
    });

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}));
      console.error('[AVSync] Python service error:', errorData);

      throw new Error(
        errorData.error || `Python service error: ${pythonResponse.status}`
      );
    }

    const result = await pythonResponse.json();

    // Calculate decision based on score, offset, and additional metrics
    const decision = makeDecision(
      result.score,
      result.offset_frames,
      result.confidence,
      result.min_dist
    );

    // Generate reason codes
    const reasonCodes = generateReasonCodes(result, decision);

    // Build response
    const response = {
      ...result,
      decision,
      reason_codes: reasonCodes,
      ttl_ms: Date.now() + 300000, // 5 min TTL
      session_id,
      request_time_ms: Date.now() - startTime,
    };

    console.log('[AVSync] Result:', {
      sessionId: session_id,
      score: result.score,
      offset: result.offset_frames,
      decision,
      processingTime: `${result.processing_time_ms}ms`,
      totalTime: `${response.request_time_ms}ms`,
    });

    // Cleanup uploaded file (optional - can be kept for 24h for debugging)
    const cleanupUploads = process.env.CLEANUP_UPLOADS === 'true';
    if (cleanupUploads) {
      await fs.unlink(file.path).catch(err => {
        console.error('[AVSync] Failed to cleanup file:', err.message);
      });
    }

    res.json(response);

  } catch (error) {
    console.error('[AVSync] Error:', error);

    // Cleanup file on error
    if (file && file.path) {
      await fs.unlink(file.path).catch(() => {});
    }

    res.status(500).json({
      error: 'Video processing failed',
      message: error.message,
      type: error.name,
      session_id: body?.session_id,
    });
  }
});

/**
 * Decision logic based on score and offset
 *
 * Based on SyncNet paper calibration (see CALIBRACION_SYNCNET.md):
 * - ≥ 80%: High confidence - Very likely human
 * - 60-79%: Medium confidence - Probably human
 * - 40-59%: Suspicious - Requires additional verification
 * - < 40%: High risk - Possible deepfake/manipulation
 *
 * IMPORTANT: Detects "suspiciously perfect" videos which may indicate
 * modern AI-generated deepfakes that have perfect sync (see DEEPFAKE_DETECTION_LIMITATIONS.md)
 */
function makeDecision(score, offsetFrames, confidence, minDist) {
  // Check for suspiciously perfect metrics (modern AI deepfakes)
  // Real human videos rarely have perfect synchronization
  const isSuspiciouslyPerfect = (
    score >= 0.95 &&
    Math.abs(offsetFrames) === 0 &&
    confidence > 10.0 &&
    minDist < 6.0
  );

  if (isSuspiciouslyPerfect) {
    console.log('[AVSync] WARNING: Suspiciously perfect metrics detected - possible AI-generated video');
    return 'SUSPICIOUS_PERFECT';
  }

  // High confidence (≥80%): Very likely human - ALLOW
  if (score >= 0.80) {
    return 'ALLOW';
  }

  // Medium confidence (60-79%): Probably human - NEXT
  // This range indicates real videos with lower quality metrics
  // (e.g., poor lighting, compression, camera angle)
  if (score >= 0.60) {
    return 'NEXT';
  }

  // Suspicious (40-59%): Requires additional verification - NEXT
  if (score >= 0.40) {
    return 'NEXT';
  }

  // Low confidence (<40%): High risk of deepfake - BLOCK
  return 'BLOCK';
}

/**
 * Generate human-readable reason codes
 */
function generateReasonCodes(result, decision) {
  const reasons = [];

  const { score, offset_frames, confidence, min_dist } = result;

  // Score-based reasons
  if (score >= 0.90) {
    reasons.push('HIGH_SYNC_SCORE');
  } else if (score >= 0.75) {
    reasons.push('MEDIUM_SYNC_SCORE');
  } else {
    reasons.push('LOW_SYNC_SCORE');
  }

  // Offset-based reasons
  if (Math.abs(offset_frames) <= 2) {
    reasons.push('LOW_OFFSET');
  } else if (Math.abs(offset_frames) <= 5) {
    reasons.push('MEDIUM_OFFSET');
  } else {
    reasons.push('HIGH_OFFSET');
  }

  // Confidence-based reasons
  if (confidence >= 10.0) {
    reasons.push('HIGH_CONFIDENCE');
  } else if (confidence >= 7.0) {
    reasons.push('MEDIUM_CONFIDENCE');
  } else {
    reasons.push('LOW_CONFIDENCE');
  }

  // Distance-based reasons
  if (min_dist <= 5.0) {
    reasons.push('LOW_DISTANCE');
  } else if (min_dist <= 7.0) {
    reasons.push('MEDIUM_DISTANCE');
  } else {
    reasons.push('HIGH_DISTANCE');
  }

  // Decision reason
  reasons.push(`DECISION_${decision}`);

  // Add warning for suspiciously perfect metrics
  if (decision === 'SUSPICIOUS_PERFECT') {
    reasons.push('SUSPICIOUSLY_PERFECT_SYNC');
    reasons.push('POSSIBLE_AI_GENERATED');
  }

  return reasons;
}

/**
 * GET /api/avsync/health
 * Health check for AV-Sync service
 */
router.get('/health', async (req, res) => {
  try {
    const pythonServiceURL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

    // Check Python service
    const response = await fetch(`${pythonServiceURL}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    const pythonHealth = await response.json();

    res.json({
      status: 'healthy',
      service: 'avsync-express-api',
      python_service: pythonHealth,
      python_service_url: pythonServiceURL,
      upload_dir: path.join(__dirname, '../tmp/uploads'),
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'avsync-express-api',
      error: error.message,
      python_service_url: process.env.PYTHON_SERVICE_URL || 'http://localhost:5000',
    });
  }
});

export default router;
