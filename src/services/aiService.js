/**
 * ============================================
 * AI Service — Groq Integration (FREE)
 * ============================================
 * 
 * Uses Groq's free API with Llama models.
 * Free tier: 30 RPM, 6000 RPD — very generous!
 * Get key: https://console.groq.com/keys
 * 
 * Groq exposes an OpenAI-compatible API, so we
 * use the OpenAI SDK pointed at Groq's endpoint.
 */

const OpenAI = require('openai');
const logger = require('../utils/logger');

// Lazy-initialize Groq client (OpenAI-compatible)
let _client = null;
function getClient() {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || 'missing-key',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }
  return _client;
}

// Models to try in order (Groq free tier)
const MODELS = [
  process.env.AI_MODEL || 'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
];

// ── Retry Helper ──────────────────────────────────────────────────────

async function retryWithFallback(callFn, maxRetries = 2) {
  for (const modelName of MODELS) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await callFn(modelName);
      } catch (err) {
        const is429 = err.message && (err.message.includes('429') || err.message.includes('rate'));
        const isQuota = err.message && err.message.includes('quota');

        if (is429 || isQuota) {
          if (attempt < maxRetries) {
            const delay = (attempt + 1) * 10000; // 10s, 20s
            logger.warn(`Rate limited on ${modelName}, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
            await sleep(delay);
          } else {
            logger.warn(`Exhausted retries for ${modelName}, trying next model...`);
          }
        } else {
          throw err;
        }
      }
    }
  }
  throw new Error('All AI models exhausted. Using fallback.');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Prompt Templates ──────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) resume analyst and career coach.

Evaluate the candidate's resume against the job description. Return ONLY a valid JSON object (no markdown, no backticks, no explanation) with this exact structure:

{
  "score": <number 0-100>,
  "score_breakdown": {
    "skills_match": <number 0-100>,
    "experience_relevance": <number 0-100>,
    "education_fit": <number 0-100>,
    "keyword_optimization": <number 0-100>,
    "overall_presentation": <number 0-100>
  },
  "missing_skills": ["skill1", "skill2"],
  "matching_skills": ["skill1", "skill2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "improved_bullets": [
    {"original": "old bullet", "improved": "better bullet with metrics"}
  ],
  "rewritten_summary": "A 3-4 sentence professional summary tailored to the JD",
  "missing_keywords": ["keyword1", "keyword2"],
  "ats_tips": ["tip1", "tip2"]
}

Be specific and actionable. Focus on quantifiable improvements. Return ONLY valid JSON.`;

const REWRITE_SYSTEM_PROMPT = `You are a professional resume writer with deep ATS optimization expertise.

Rewrite the resume to match the target job description. Rules:
1. Keep ALL facts truthful — never fabricate
2. Use strong action verbs and quantified achievements
3. Include relevant keywords from the JD naturally
4. Use this format: PROFESSIONAL SUMMARY, SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS
5. Optimize for ATS — no tables, graphics, or special characters

Return the rewritten resume as clean plain text.`;

// ── Core Functions ────────────────────────────────────────────────────

async function analyzeResume(resumeText, jdText) {
  logger.info('Sending resume + JD to Groq for analysis...');

  const result = await retryWithFallback(async (modelName) => {
    logger.info(`Trying model: ${modelName}`);

    const response = await getClient().chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## RESUME:\n\n${resumeText}\n\n---\n\n## JOB DESCRIPTION:\n\n${jdText}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    // Clean any markdown fences
    const cleaned = content
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    logger.info(`Analysis complete (${modelName}) — Score: ${parsed.score}`);
    return parsed;
  });

  return result;
}

async function rewriteResume(resumeText, jdText) {
  logger.info('Sending resume to Groq for rewriting...');

  const result = await retryWithFallback(async (modelName) => {
    logger.info(`Trying model: ${modelName}`);

    const response = await getClient().chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: REWRITE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Rewrite this resume for the job description below.\n\n## ORIGINAL RESUME:\n\n${resumeText}\n\n---\n\n## TARGET JOB DESCRIPTION:\n\n${jdText}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 4000,
    });

    const rewritten = response.choices[0].message.content.trim();
    logger.info(`Rewriting complete (${modelName}) — ${rewritten.length} chars`);
    return rewritten;
  });

  return result;
}

/**
 * Fallback analysis when AI is unavailable.
 */
function fallbackAnalysis(resumeText, jdText) {
  logger.warn('Using fallback (non-AI) analysis');

  const resumeWords = new Set(
    resumeText.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
  );
  const jdWords = (jdText.toLowerCase().match(/\b[a-z]{3,}\b/g) || []);

  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
    'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been',
    'will', 'with', 'this', 'that', 'from', 'they', 'were', 'been',
    'said', 'each', 'which', 'their', 'about', 'would', 'make',
    'like', 'into', 'could', 'time', 'very', 'when', 'come', 'than',
    'look', 'only', 'some', 'also', 'back', 'after', 'work', 'year',
  ]);

  const jdKeywords = [...new Set(jdWords.filter(w => !stopWords.has(w)))];
  const matching   = jdKeywords.filter(w => resumeWords.has(w));
  const missing    = jdKeywords.filter(w => !resumeWords.has(w)).slice(0, 15);

  const score = jdKeywords.length > 0
    ? Math.round((matching.length / jdKeywords.length) * 100)
    : 0;

  return {
    score: Math.min(score, 100),
    score_breakdown: {
      skills_match: score, experience_relevance: 0,
      education_fit: 0, keyword_optimization: score, overall_presentation: 0,
    },
    missing_skills: missing.slice(0, 10),
    matching_skills: matching.slice(0, 10),
    suggestions: [
      'Add more keywords from the job description to your resume.',
      'Quantify your achievements with numbers and metrics.',
      'Tailor your professional summary to match the role.',
      '⚠️ Basic keyword analysis only. AI was unavailable.',
    ],
    improved_bullets: [],
    rewritten_summary: '',
    missing_keywords: missing,
    ats_tips: [
      'Use standard section headings (Experience, Education, Skills).',
      'Avoid graphics, tables, and special characters.',
      'Use a single-column format for best ATS compatibility.',
    ],
  };
}

module.exports = {
  analyzeResume,
  rewriteResume,
  fallbackAnalysis,
  ANALYSIS_SYSTEM_PROMPT,
  REWRITE_SYSTEM_PROMPT,
};
