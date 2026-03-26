/**
 * ============================================
 * Telegram Bot — Setup & Launch
 * ============================================
 * 
 * Creates the Telegraf bot instance, registers
 * all command and message handlers, and starts
 * polling for updates.
 */

const { Telegraf } = require('telegraf');
const logger = require('../utils/logger');
const { registerHandlers } = require('./handlers');

let bot;

/**
 * Launch the Telegram bot.
 */
function launchBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.error('TELEGRAM_BOT_TOKEN is not set');
    process.exit(1);
  }

  bot = new Telegraf(token);

  // ── Global error handling ─────────────────────────────────────────
  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}: ${err.message}`);
    try {
      ctx.reply('⚠️ An unexpected error occurred. Please try again or use /start to restart.');
    } catch (_) {
      // Ignore reply errors
    }
  });

  // ── Register all handlers ─────────────────────────────────────────
  registerHandlers(bot);

  // ── Launch bot ────────────────────────────────────────────────────
  bot.launch()
    .then(() => {
      logger.info('🤖 ResumeAlign Bot is running and listening for messages');
    })
    .catch((err) => {
      logger.error(`Failed to launch bot: ${err.message}`);
      process.exit(1);
    });

  // ── Graceful stop on process signals ──────────────────────────────
  process.once('SIGINT',  () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

/**
 * Get the bot instance (for testing / external use).
 */
function getBot() {
  return bot;
}

module.exports = { launchBot, getBot };
