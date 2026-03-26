/**
 * ============================================
 * Parser Service
 * ============================================
 * 
 * Extracts plain text from PDF and DOCX files
 * using pdf-parse and mammoth respectively.
 */

const fs      = require('fs');
const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');
const logger   = require('../utils/logger');

/**
 * Extract text from a PDF file.
 * @param {string} filePath — Absolute path to the PDF
 * @returns {Promise<string>} — Extracted text
 */
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const text = data.text.trim();

    if (!text) {
      throw new Error('PDF appears to contain no extractable text (possibly scanned/image-based).');
    }
    logger.info(`Parsed PDF: ${text.length} characters extracted`);
    return text;
  } catch (err) {
    logger.error(`PDF parsing failed: ${err.message}`);
    throw new Error(`Could not parse PDF: ${err.message}`);
  }
}

/**
 * Extract text from a DOCX file.
 * @param {string} filePath — Absolute path to the DOCX
 * @returns {Promise<string>} — Extracted text
 */
async function parseDOCX(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value.trim();

    if (!text) {
      throw new Error('DOCX appears to contain no extractable text.');
    }
    if (result.messages.length > 0) {
      logger.warn(`DOCX parsing warnings: ${JSON.stringify(result.messages)}`);
    }
    logger.info(`Parsed DOCX: ${text.length} characters extracted`);
    return text;
  } catch (err) {
    logger.error(`DOCX parsing failed: ${err.message}`);
    throw new Error(`Could not parse DOCX: ${err.message}`);
  }
}

/**
 * Unified parser — detects format by extension and delegates.
 * @param {string} filePath — Absolute path to the resume file
 * @param {string} ext      — File extension (e.g. '.pdf', '.docx')
 * @returns {Promise<string>}
 */
async function parseResume(filePath, ext) {
  const extension = ext.toLowerCase();

  switch (extension) {
    case '.pdf':
      return parsePDF(filePath);
    case '.docx':
      return parseDOCX(filePath);
    default:
      throw new Error(`Unsupported file format: ${extension}. Please upload a PDF or DOCX file.`);
  }
}

module.exports = {
  parsePDF,
  parseDOCX,
  parseResume,
};
