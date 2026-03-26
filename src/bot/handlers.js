/**
 * ============================================
 * Telegram Bot — Handlers
 * ============================================
 * 
 * All command and message handlers for the bot.
 * Manages per-user session state, file uploads,
 * JD input, and triggers the processing pipeline.
 */

const fs     = require('fs');
const path   = require('path');
const axios  = require('axios');
const logger = require('../utils/logger');
const { downloadFile, getFileExtension, cleanupFiles } = require('../utils/fileHandler');
const { processResume } = require('../controllers/resumeController');

// ── In-Memory Session Store ─────────────────────────────────────────
// Maps chatId → { state, resumePath, resumeExt, jdText, ... }
const sessions = new Map();

/**
 * States for the conversation flow:
 *   IDLE           → Waiting for /start or /analyze
 *   AWAITING_RESUME → Waiting for resume upload
 *   AWAITING_JD     → Waiting for job description text
 *   PROCESSING      → Currently analyzing
 */
const STATE = {
  IDLE: 'IDLE',
  AWAITING_RESUME: 'AWAITING_RESUME',
  AWAITING_JD: 'AWAITING_JD',
  PROCESSING: 'PROCESSING',
};

/**
 * Get or create a session for a chat.
 */
function getSession(chatId) {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, {
      state: STATE.IDLE,
      resumePath: null,
      resumeExt: null,
      jdText: null,
    });
  }
  return sessions.get(chatId);
}

/**
 * Reset a session to idle.
 */
function resetSession(chatId) {
  const session = sessions.get(chatId);
  if (session) {
    // Cleanup any temp files
    if (session.resumePath) {
      cleanupFiles([session.resumePath]);
    }
  }
  sessions.set(chatId, {
    state: STATE.IDLE,
    resumePath: null,
    resumeExt: null,
    jdText: null,
  });
}

/**
 * Register all bot handlers.
 * @param {import('telegraf').Telegraf} bot
 */
function registerHandlers(bot) {

  // ── /start Command ────────────────────────────────────────────────
  bot.start((ctx) => {
    const chatId = ctx.chat.id;
    resetSession(chatId);

    ctx.replyWithMarkdown(
      `🎯 *Welcome to ResumeAlign Bot!*\n\n` +
      `I help you optimize your resume to match specific job descriptions.\n\n` +
      `Here's what I can do:\n` +
      `📊 Analyze your resume against a job description\n` +
      `🔍 Identify missing skills and keywords\n` +
      `💡 Provide actionable improvement suggestions\n` +
      `📄 Generate an ATS-optimized resume (PDF & DOCX)\n\n` +
      `*Commands:*\n` +
      `/analyze — Start a new resume analysis\n` +
      `/help — Show help information\n` +
      `/cancel — Cancel current operation\n\n` +
      `Ready? Use /analyze to get started! 🚀`
    );
  });

  // ── /help Command ─────────────────────────────────────────────────
  bot.help((ctx) => {
    ctx.replyWithMarkdown(
      `📖 *ResumeAlign Bot — Help*\n\n` +
      `*How to use:*\n` +
      `1️⃣ Use /analyze to start\n` +
      `2️⃣ Upload your resume (PDF or DOCX)\n` +
      `3️⃣ Paste the job description\n` +
      `4️⃣ Wait for analysis & optimized resume\n\n` +
      `*Supported Formats:*\n` +
      `📄 PDF (.pdf)\n` +
      `📝 DOCX (.docx)\n\n` +
      `*Commands:*\n` +
      `/start — Restart the bot\n` +
      `/analyze — Start new analysis\n` +
      `/cancel — Cancel current operation\n` +
      `/help — Show this message\n\n` +
      `*Tips:*\n` +
      `• Make sure your resume is text-based (not scanned/image)\n` +
      `• Paste the full job description for best results\n` +
      `• You can run multiple analyses with different JDs`
    );
  });

  // ── /analyze Command ──────────────────────────────────────────────
  bot.command('analyze', (ctx) => {
    const chatId  = ctx.chat.id;
    const session = getSession(chatId);

    if (session.state === STATE.PROCESSING) {
      return ctx.reply('⏳ I\'m still processing your previous request. Please wait.');
    }

    resetSession(chatId);
    const newSession  = getSession(chatId);
    newSession.state = STATE.AWAITING_RESUME;

    ctx.replyWithMarkdown(
      `📎 *Step 1/2: Upload your resume*\n\n` +
      `Please send your resume as a file attachment.\n` +
      `Supported formats: *PDF* or *DOCX*\n\n` +
      `_Use /cancel to abort._`
    );
  });

  // ── /cancel Command ───────────────────────────────────────────────
  bot.command('cancel', (ctx) => {
    const chatId = ctx.chat.id;
    resetSession(chatId);
    ctx.reply('❌ Operation cancelled. Use /analyze to start over.');
  });

  // ── Document Upload Handler ───────────────────────────────────────
  bot.on('document', async (ctx) => {
    const chatId  = ctx.chat.id;
    const session = getSession(chatId);

    if (session.state !== STATE.AWAITING_RESUME) {
      return ctx.replyWithMarkdown(
        'Please use /analyze first to start a new analysis, then upload your resume.'
      );
    }

    const document = ctx.message.document;
    const fileName = document.file_name || '';
    const ext      = getFileExtension(fileName);

    // Validate file type
    if (!['.pdf', '.docx'].includes(ext)) {
      return ctx.replyWithMarkdown(
        `❌ *Unsupported format:* \`${ext || 'unknown'}\`\n\n` +
        `Please upload a *PDF* or *DOCX* file.`
      );
    }

    // Validate file size (max 20MB)
    if (document.file_size > 20 * 1024 * 1024) {
      return ctx.reply('❌ File is too large. Please upload a file under 20MB.');
    }

    try {
      await ctx.reply('📥 Downloading your resume...');

      // Get file link from Telegram
      const fileLink = await ctx.telegram.getFileLink(document.file_id);
      const filePath = await downloadFile(fileLink.href, ext);

      // Update session
      session.resumePath = filePath;
      session.resumeExt  = ext;
      session.state      = STATE.AWAITING_JD;

      ctx.replyWithMarkdown(
        `✅ Resume received! (\`${fileName}\`)\n\n` +
        `📝 *Step 2/2: Paste the Job Description*\n\n` +
        `Please paste the full job description text below.\n\n` +
        `_Use /cancel to abort._`
      );
    } catch (err) {
      logger.error(`Failed to download document: ${err.message}`);
      ctx.reply('❌ Failed to download your file. Please try again.');
    }
  });

  // ── Text Message Handler (JD Input) ───────────────────────────────
  bot.on('text', async (ctx) => {
    const chatId  = ctx.chat.id;
    const session = getSession(chatId);
    const text    = ctx.message.text;

    // Ignore commands (they're handled above)
    if (text.startsWith('/')) return;

    // ── State: Awaiting JD ──────────────────────────────────────────
    if (session.state === STATE.AWAITING_JD) {
      if (text.length < 30) {
        return ctx.reply('⚠️ The job description seems too short. Please paste the full JD (at least 30 characters).');
      }

      session.jdText = text;
      session.state  = STATE.PROCESSING;

      await ctx.replyWithMarkdown(
        `✅ Job description received!\n\n` +
        `⏳ *Analyzing your resume...* This may take 30–60 seconds.\n\n` +
        `🔍 Parsing resume\n` +
        `📊 Computing keyword match\n` +
        `🤖 Running AI analysis\n` +
        `📝 Generating optimized resume`
      );

      // ── Trigger Processing Pipeline ───────────────────────────────
      const filesToCleanup = [];

      try {
        const result = await processResume(
          session.resumePath,
          session.resumeExt,
          session.jdText
        );

        filesToCleanup.push(result.pdfPath, result.docxPath);

        // Send the analysis report
        await ctx.replyWithMarkdown(result.formattedMessage);

        // Send the PDF file
        if (result.pdfPath && fs.existsSync(result.pdfPath)) {
          await ctx.replyWithDocument(
            { source: result.pdfPath, filename: 'improved_resume.pdf' },
            { caption: '📄 Your optimized resume (PDF)' }
          );
        }

        // Send the DOCX file
        if (result.docxPath && fs.existsSync(result.docxPath)) {
          await ctx.replyWithDocument(
            { source: result.docxPath, filename: 'improved_resume.docx' },
            { caption: '📝 Your optimized resume (DOCX)' }
          );
        }

        await ctx.replyWithMarkdown(
          `✅ *Analysis complete!*\n\n` +
          `Use /analyze to analyze with a different job description.\n` +
          `Use /start to restart the bot.`
        );

      } catch (err) {
        logger.error(`Processing failed: ${err.message}`);
        await ctx.replyWithMarkdown(
          `❌ *Processing Error*\n\n` +
          `${err.message}\n\n` +
          `Please try again with /analyze or contact support if the issue persists.`
        );
      } finally {
        // Cleanup
        resetSession(chatId);
        cleanupFiles(filesToCleanup);
      }

      return;
    }

    // ── State: Awaiting Resume (user sent text instead of file) ─────
    if (session.state === STATE.AWAITING_RESUME) {
      return ctx.replyWithMarkdown(
        `⚠️ I'm expecting a *file*, not text.\n\n` +
        `Please upload your resume as a PDF or DOCX file attachment.`
      );
    }

    // ── State: Processing ───────────────────────────────────────────
    if (session.state === STATE.PROCESSING) {
      return ctx.reply('⏳ I\'m still processing your request. Please wait...');
    }

    // ── State: Idle ─────────────────────────────────────────────────
    ctx.replyWithMarkdown(
      `👋 Hi! Use /analyze to start a resume analysis, or /help for more info.`
    );
  });

  logger.info('All bot handlers registered');
}

module.exports = { registerHandlers };
