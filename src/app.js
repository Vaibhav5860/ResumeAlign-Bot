/**
 * ============================================
 * ResumeAlign Bot — Main Application Entry
 * ============================================
 * 
 * Bootstraps the Express server and the Telegram bot.
 * Loads environment variables, sets up routes, and
 * starts listening for incoming messages.
 */

const path = require('path');
const dotenvResult = require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const express = require('express');
const fs      = require('fs');
const logger  = require('./utils/logger');
const { launchBot } = require('./bot/bot');
const apiRoutes     = require('./routes/apiRoutes');

// ── Validate critical env vars ────────────────────────────────────────
const requiredEnv = ['TELEGRAM_BOT_TOKEN', 'GROQ_API_KEY'];
for (const key of requiredEnv) {
  if (!process.env[key] || process.env[key].startsWith('your_')) {
    logger.error(`Missing or placeholder environment variable: ${key}`);
    logger.error('Please set valid values in your .env file before starting.');
    process.exit(1);
  }
}

// ── Ensure temp directory exists ──────────────────────────────────────
const tempDir = path.resolve(process.env.TEMP_DIR || './temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  logger.info(`Created temp directory at ${tempDir}`);
}

// ── Express App Setup ─────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health-check & API routes
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/api', apiRoutes);

// ── Start Server ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀  Express server running on port ${PORT}`);
});

// ── Launch Telegram Bot ───────────────────────────────────────────────
launchBot();

// ── Graceful Shutdown ─────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
};
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = app;
