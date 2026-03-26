/**
 * ============================================
 * API Routes (Optional REST API)
 * ============================================
 * 
 * Provides HTTP endpoints for resume analysis,
 * allowing integration with external services
 * or a web-based frontend.
 */

const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const logger  = require('../utils/logger');
const { processResume, processFromText } = require('../controllers/resumeController');
const { getFileExtension, TEMP_DIR } = require('../utils/fileHandler');
const { cleanupFiles } = require('../utils/fileHandler');

// ── Health Check ────────────────────────────────────────────────────
router.get('/status', (_req, res) => {
  res.json({
    status: 'online',
    service: 'ResumeAlign Bot API',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Analyze from Text ───────────────────────────────────────────────
/**
 * POST /api/analyze
 * Body: { resumeText: string, jdText: string }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { resumeText, jdText } = req.body;

    if (!resumeText || !jdText) {
      return res.status(400).json({
        error: 'Both resumeText and jdText are required.',
      });
    }

    if (resumeText.length < 50) {
      return res.status(400).json({
        error: 'Resume text is too short (minimum 50 characters).',
      });
    }

    if (jdText.length < 30) {
      return res.status(400).json({
        error: 'Job description is too short (minimum 30 characters).',
      });
    }

    logger.info('API: Processing text-based analysis request');

    const result = await processFromText(resumeText, jdText);

    // Read generated files as base64 for API response
    let pdfBase64 = null;
    let docxBase64 = null;

    if (result.pdfPath && fs.existsSync(result.pdfPath)) {
      pdfBase64 = fs.readFileSync(result.pdfPath).toString('base64');
    }
    if (result.docxPath && fs.existsSync(result.docxPath)) {
      docxBase64 = fs.readFileSync(result.docxPath).toString('base64');
    }

    // Cleanup temp files
    cleanupFiles([result.pdfPath, result.docxPath].filter(Boolean));

    res.json({
      success: true,
      report: result.report,
      rewrittenResume: result.rewrittenResume,
      files: {
        pdf: pdfBase64 ? { data: pdfBase64, filename: 'improved_resume.pdf' } : null,
        docx: docxBase64 ? { data: docxBase64, filename: 'improved_resume.docx' } : null,
      },
    });
  } catch (err) {
    logger.error(`API error: ${err.message}`);
    res.status(500).json({
      error: 'Processing failed',
      message: err.message,
    });
  }
});

// ── Score Only (lightweight) ────────────────────────────────────────
/**
 * POST /api/score
 * Body: { resumeText: string, jdText: string }
 * Returns only the keyword score without AI analysis.
 */
router.post('/score', (req, res) => {
  try {
    const { resumeText, jdText } = req.body;

    if (!resumeText || !jdText) {
      return res.status(400).json({
        error: 'Both resumeText and jdText are required.',
      });
    }

    const { computeKeywordScore } = require('../services/scoringService');
    const result = computeKeywordScore(resumeText, jdText);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    logger.error(`API score error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
