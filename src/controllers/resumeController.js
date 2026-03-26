/**
 * ============================================
 * Resume Controller
 * ============================================
 * 
 * Orchestrates the full resume analysis pipeline:
 *   1. Parse uploaded resume
 *   2. Run keyword scoring
 *   3. Run AI analysis (with fallback)
 *   4. Merge scores
 *   5. Rewrite resume via AI
 *   6. Generate PDF + DOCX output files
 * 
 * Used by both the Telegram bot handlers and the
 * optional REST API.
 */

const { parseResume }       = require('../services/parserService');
const { analyzeResume, rewriteResume, fallbackAnalysis } = require('../services/aiService');
const { computeKeywordScore, mergeScores, formatReport }  = require('../services/scoringService');
const { generatePDF, generateDOCX } = require('../services/resumeBuilder');
const logger = require('../utils/logger');

/**
 * Full processing pipeline.
 * 
 * @param {string} resumeFilePath — Path to uploaded resume file
 * @param {string} resumeExt      — File extension (.pdf or .docx)
 * @param {string} jdText         — Raw job description text
 * @returns {Promise<Object>}     — { report, formattedMessage, pdfPath, docxPath, rewrittenResume }
 */
async function processResume(resumeFilePath, resumeExt, jdText) {
  logger.info('Starting resume processing pipeline...');

  // ── Step 1: Parse resume ──────────────────────────────────────────
  logger.info('Step 1/5: Parsing resume...');
  const resumeText = await parseResume(resumeFilePath, resumeExt);

  if (!resumeText || resumeText.length < 50) {
    throw new Error('Resume text is too short or could not be extracted. Please upload a valid resume.');
  }

  // ── Step 2: Keyword scoring ───────────────────────────────────────
  logger.info('Step 2/5: Computing keyword score...');
  const keywordResult = computeKeywordScore(resumeText, jdText);
  logger.info(`Keyword score: ${keywordResult.keywordScore}% (${keywordResult.totalMatched}/${keywordResult.totalJDKeywords} keywords matched)`);

  // ── Step 3: AI analysis (with fallback) ───────────────────────────
  logger.info('Step 3/5: Running AI analysis...');
  let aiResult;
  try {
    aiResult = await analyzeResume(resumeText, jdText);
  } catch (err) {
    logger.warn(`AI analysis failed, using fallback: ${err.message}`);
    aiResult = fallbackAnalysis(resumeText, jdText);
  }

  // ── Step 4: Merge scores ──────────────────────────────────────────
  logger.info('Step 4/5: Merging scores...');
  const report          = mergeScores(keywordResult, aiResult);
  const formattedMessage = formatReport(report);

  // ── Step 5: Rewrite & generate files ──────────────────────────────
  logger.info('Step 5/5: Rewriting resume & generating files...');
  let rewrittenResume;
  try {
    rewrittenResume = await rewriteResume(resumeText, jdText);
  } catch (err) {
    logger.warn(`Resume rewriting failed, using original: ${err.message}`);
    rewrittenResume = resumeText;
  }

  // Generate output files in parallel
  const [pdfPath, docxPath] = await Promise.all([
    generatePDF(rewrittenResume, report),
    generateDOCX(rewrittenResume, report),
  ]);

  logger.info('✅ Resume processing pipeline complete');

  return {
    report,
    formattedMessage,
    pdfPath,
    docxPath,
    rewrittenResume,
    originalResumeText: resumeText,
  };
}

/**
 * Process from raw text inputs (for API usage).
 * 
 * @param {string} resumeText
 * @param {string} jdText
 * @returns {Promise<Object>}
 */
async function processFromText(resumeText, jdText) {
  logger.info('Starting text-based processing pipeline...');

  const keywordResult = computeKeywordScore(resumeText, jdText);

  let aiResult;
  try {
    aiResult = await analyzeResume(resumeText, jdText);
  } catch (err) {
    logger.warn(`AI analysis failed, using fallback: ${err.message}`);
    aiResult = fallbackAnalysis(resumeText, jdText);
  }

  const report           = mergeScores(keywordResult, aiResult);
  const formattedMessage = formatReport(report);

  let rewrittenResume;
  try {
    rewrittenResume = await rewriteResume(resumeText, jdText);
  } catch (err) {
    logger.warn(`Resume rewriting failed: ${err.message}`);
    rewrittenResume = resumeText;
  }

  const [pdfPath, docxPath] = await Promise.all([
    generatePDF(rewrittenResume, report),
    generateDOCX(rewrittenResume, report),
  ]);

  return {
    report,
    formattedMessage,
    pdfPath,
    docxPath,
    rewrittenResume,
  };
}

module.exports = {
  processResume,
  processFromText,
};
