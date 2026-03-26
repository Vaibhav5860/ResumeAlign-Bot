/**
 * ============================================
 * File Handler Utility
 * ============================================
 * 
 * Helpers for downloading Telegram files, writing
 * temp files, and cleaning up after processing.
 */

const fs    = require('fs');
const path  = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const TEMP_DIR = path.resolve(process.env.TEMP_DIR || './temp');

/**
 * Ensure the temp directory exists
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * Download a file from a URL and save it locally.
 * @param {string} fileUrl  — The direct URL to the file
 * @param {string} ext      — File extension (e.g. '.pdf', '.docx')
 * @returns {Promise<string>} — Absolute path to the saved file
 */
async function downloadFile(fileUrl, ext) {
  ensureTempDir();
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(TEMP_DIR, filename);

  const response = await axios({
    method: 'GET',
    url: fileUrl,
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(filePath));
    writer.on('error', reject);
  });
}

/**
 * Write a buffer to a temp file.
 * @param {Buffer} buffer
 * @param {string} ext
 * @returns {string} — Absolute path to the written file
 */
function writeTempFile(buffer, ext) {
  ensureTempDir();
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Delete a file from disk (fire-and-forget).
 * @param {string} filePath
 */
function cleanupFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.debug(`Cleaned up temp file: ${filePath}`);
    }
  } catch (err) {
    logger.warn(`Failed to cleanup file ${filePath}: ${err.message}`);
  }
}

/**
 * Clean up multiple files.
 * @param {string[]} filePaths
 */
function cleanupFiles(filePaths) {
  for (const fp of filePaths) {
    cleanupFile(fp);
  }
}

/**
 * Get the MIME-based extension from a Telegram file name.
 * @param {string} fileName
 * @returns {string}
 */
function getFileExtension(fileName) {
  if (!fileName) return '';
  const ext = path.extname(fileName).toLowerCase();
  return ext;
}

module.exports = {
  downloadFile,
  writeTempFile,
  cleanupFile,
  cleanupFiles,
  getFileExtension,
  TEMP_DIR,
};
