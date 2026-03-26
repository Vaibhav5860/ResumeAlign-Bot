/**
 * ============================================
 * Scoring Service
 * ============================================
 * 
 * Combines keyword-level matching with AI-powered
 * semantic evaluation to produce a comprehensive
 * match score and detailed breakdown.
 */

const logger = require('../utils/logger');

/**
 * Extract meaningful keywords from text.
 * Filters out common stop words and short tokens.
 * 
 * @param {string} text
 * @returns {string[]}
 */
function extractKeywords(text) {
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'will', 'with', 'this', 'that', 'from', 'they', 'were', 'said',
    'each', 'which', 'their', 'about', 'would', 'make', 'like', 'into',
    'could', 'time', 'very', 'when', 'come', 'than', 'look', 'only',
    'some', 'also', 'back', 'after', 'work', 'year', 'most', 'than',
    'them', 'other', 'over', 'such', 'through', 'should', 'must',
    'including', 'ability', 'strong', 'using', 'working', 'within',
    'role', 'responsibilities', 'requirements', 'required', 'preferred',
    'experience', 'minimum', 'plus', 'years', 'looking', 'join',
    'team', 'company', 'position', 'candidate', 'ideal', 'offer',
    'what', 'will', 'your', 'more', 'well', 'need', 'does', 'just',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\.#\+]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  // Deduplicate
  return [...new Set(words)];
}

/**
 * Compute a keyword-based match score.
 * 
 * @param {string} resumeText
 * @param {string} jdText
 * @returns {{ keywordScore: number, matchedKeywords: string[], missingKeywords: string[] }}
 */
function computeKeywordScore(resumeText, jdText) {
  const jdKeywords     = extractKeywords(jdText);
  const resumeKeywords = new Set(extractKeywords(resumeText));

  const matched = jdKeywords.filter(k => resumeKeywords.has(k));
  const missing = jdKeywords.filter(k => !resumeKeywords.has(k));

  const score = jdKeywords.length > 0
    ? Math.round((matched.length / jdKeywords.length) * 100)
    : 0;

  return {
    keywordScore: Math.min(score, 100),
    matchedKeywords: matched,
    missingKeywords: missing,
    totalJDKeywords: jdKeywords.length,
    totalMatched: matched.length,
  };
}

/**
 * Merge a keyword score with an AI analysis result
 * to produce a final composite score and report.
 * 
 * @param {Object} keywordResult — From computeKeywordScore
 * @param {Object} aiResult      — From aiService.analyzeResume
 * @returns {Object} — Final merged report
 */
function mergeScores(keywordResult, aiResult) {
  // Weighted average: 30% keyword-based, 70% AI-based
  const KEYWORD_WEIGHT = 0.3;
  const AI_WEIGHT      = 0.7;

  const compositeScore = Math.round(
    keywordResult.keywordScore * KEYWORD_WEIGHT +
    (aiResult.score || 0) * AI_WEIGHT
  );

  return {
    compositeScore: Math.min(compositeScore, 100),
    keywordScore: keywordResult.keywordScore,
    aiScore: aiResult.score || 0,
    scoreBreakdown: aiResult.score_breakdown || {},
    matchedKeywords: keywordResult.matchedKeywords,
    missingKeywords: keywordResult.missingKeywords.slice(0, 20),
    missingSkills: aiResult.missing_skills || [],
    matchingSkills: aiResult.matching_skills || [],
    suggestions: aiResult.suggestions || [],
    improvedBullets: aiResult.improved_bullets || [],
    rewrittenSummary: aiResult.rewritten_summary || '',
    atsTips: aiResult.ats_tips || [],
  };
}

/**
 * Format the final report into a user-friendly Telegram message.
 * 
 * @param {Object} report — From mergeScores
 * @returns {string}
 */
function formatReport(report) {
  const scoreEmoji = report.compositeScore >= 80 ? '🟢'
    : report.compositeScore >= 60 ? '🟡'
    : '🔴';

  let msg = '';

  // ── Header ──────────────────────────────────────────
  msg += `${scoreEmoji} *Resume Match Score: ${report.compositeScore}/100*\n\n`;

  // ── Score Breakdown ─────────────────────────────────
  msg += `📊 *Score Breakdown*\n`;
  msg += `├ Keyword Match: ${report.keywordScore}%\n`;
  msg += `├ AI Semantic Score: ${report.aiScore}%\n`;
  if (report.scoreBreakdown.skills_match != null) {
    msg += `├ Skills Match: ${report.scoreBreakdown.skills_match}%\n`;
    msg += `├ Experience Relevance: ${report.scoreBreakdown.experience_relevance}%\n`;
    msg += `├ Education Fit: ${report.scoreBreakdown.education_fit}%\n`;
    msg += `└ Presentation: ${report.scoreBreakdown.overall_presentation}%\n`;
  }
  msg += '\n';

  // ── Matching Skills ─────────────────────────────────
  if (report.matchingSkills.length > 0) {
    msg += `✅ *Matching Skills*\n`;
    msg += report.matchingSkills.map(s => `• ${s}`).join('\n') + '\n\n';
  }

  // ── Missing Skills ──────────────────────────────────
  if (report.missingSkills.length > 0) {
    msg += `❌ *Missing Skills*\n`;
    msg += report.missingSkills.map(s => `• ${s}`).join('\n') + '\n\n';
  }

  // ── Missing Keywords ────────────────────────────────
  if (report.missingKeywords.length > 0) {
    const topMissing = report.missingKeywords.slice(0, 10);
    msg += `🔑 *Missing Keywords*\n`;
    msg += topMissing.map(k => `• ${k}`).join('\n') + '\n\n';
  }

  // ── Suggestions ─────────────────────────────────────
  if (report.suggestions.length > 0) {
    msg += `💡 *Improvement Suggestions*\n`;
    report.suggestions.forEach((s, i) => {
      msg += `${i + 1}. ${s}\n`;
    });
    msg += '\n';
  }

  // ── ATS Tips ────────────────────────────────────────
  if (report.atsTips && report.atsTips.length > 0) {
    msg += `🤖 *ATS Optimization Tips*\n`;
    report.atsTips.forEach((t, i) => {
      msg += `${i + 1}. ${t}\n`;
    });
    msg += '\n';
  }

  // ── Improved Bullets Preview ────────────────────────
  if (report.improvedBullets && report.improvedBullets.length > 0) {
    msg += `📝 *Sample Improved Bullet Points*\n`;
    report.improvedBullets.slice(0, 3).forEach((b) => {
      msg += `_Before:_ ${b.original || 'N/A'}\n`;
      msg += `*After:* ${b.improved || 'N/A'}\n\n`;
    });
  }

  msg += `📄 _Generating your optimized resume files..._`;

  return msg;
}

module.exports = {
  extractKeywords,
  computeKeywordScore,
  mergeScores,
  formatReport,
};
