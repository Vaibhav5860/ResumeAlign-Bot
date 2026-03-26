/**
 * ============================================
 * Mock Test Suite
 * ============================================
 * 
 * Runs basic tests using mock data to verify
 * the scoring service and keyword extraction
 * without requiring API keys.
 * 
 * Usage: npm test  (or: node tests/mockTest.js)
 */

const { extractKeywords, computeKeywordScore, mergeScores, formatReport } = require('../src/services/scoringService');
const { fallbackAnalysis } = require('../src/services/aiService');

// ── Mock Data ───────────────────────────────────────────────────────

const MOCK_RESUME = `
John Smith
Senior Software Engineer
john.smith@email.com | (555) 123-4567 | linkedin.com/in/johnsmith | github.com/johnsmith

PROFESSIONAL SUMMARY
Experienced software engineer with 6+ years of expertise in building scalable web applications 
using JavaScript, React, Node.js, and cloud technologies. Strong background in agile development 
methodologies, CI/CD pipelines, and database management.

SKILLS
Languages: JavaScript, TypeScript, Python, SQL
Frontend: React, Redux, Next.js, HTML5, CSS3, Tailwind CSS
Backend: Node.js, Express.js, GraphQL, REST APIs
Databases: PostgreSQL, MongoDB, Redis
Cloud: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes
Tools: Git, Jenkins, JIRA, Figma, VS Code
Methodologies: Agile/Scrum, TDD, CI/CD

PROFESSIONAL EXPERIENCE

Senior Software Engineer | TechCorp Inc. | Jan 2021 – Present
- Led development of a customer-facing SaaS platform serving 50,000+ users
- Architected microservices using Node.js and GraphQL, reducing API response time by 40%
- Implemented CI/CD pipelines with Jenkins and Docker, cutting deployment time by 60%
- Mentored 3 junior developers and conducted code reviews

Software Engineer | WebDev Solutions | Mar 2018 – Dec 2020
- Built responsive web applications using React and Redux
- Developed RESTful APIs with Node.js and Express
- Managed PostgreSQL databases and optimized complex queries
- Collaborated with product team in agile sprints

EDUCATION
BS Computer Science | State University | 2017
`;

const MOCK_JD = `
Senior Full-Stack Engineer

We are looking for an experienced Full-Stack Engineer to join our growing team. 
You will be responsible for designing, developing, and maintaining web applications 
using modern technologies.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in JavaScript/TypeScript
- Experience with React, Angular, or Vue.js
- Backend experience with Node.js, Python, or Java
- Experience with cloud platforms (AWS, GCP, or Azure)
- Proficiency with relational databases (PostgreSQL, MySQL)
- Experience with Docker and container orchestration (Kubernetes)
- Knowledge of CI/CD pipelines
- Experience with GraphQL and REST APIs
- Strong understanding of microservices architecture
- Excellent problem-solving skills
- Experience with Terraform or CloudFormation (infrastructure as code)
- Knowledge of message queues (RabbitMQ, Kafka)
- Experience with monitoring tools (Datadog, New Relic, Prometheus)

Nice to have:
- Experience with machine learning or AI integration
- Mobile development experience (React Native)
- Open source contributions
- AWS certifications

Benefits:
- Competitive salary
- Remote-first culture
- Health insurance
- Professional development budget
`;

// ── Test Functions ──────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// ── Test 1: Keyword Extraction ──────────────────────────────────────
console.log('\n🧪 Test 1: Keyword Extraction');
const keywords = extractKeywords(MOCK_JD);
assert(keywords.length > 10, `Extracted ${keywords.length} keywords from JD`);
assert(keywords.includes('javascript'), 'Contains "javascript"');
assert(keywords.includes('react'), 'Contains "react"');
assert(keywords.includes('docker'), 'Contains "docker"');
assert(keywords.includes('graphql'), 'Contains "graphql"');
assert(!keywords.includes('the'), 'Filters stop word "the"');
assert(!keywords.includes('and'), 'Filters stop word "and"');

// ── Test 2: Keyword Scoring ─────────────────────────────────────────
console.log('\n🧪 Test 2: Keyword Scoring');
const scoreResult = computeKeywordScore(MOCK_RESUME, MOCK_JD);
assert(scoreResult.keywordScore >= 0 && scoreResult.keywordScore <= 100, `Score is valid: ${scoreResult.keywordScore}%`);
assert(scoreResult.matchedKeywords.length > 0, `Matched ${scoreResult.matchedKeywords.length} keywords`);
assert(scoreResult.missingKeywords.length > 0, `Missing ${scoreResult.missingKeywords.length} keywords`);
assert(scoreResult.totalJDKeywords > 0, `Total JD keywords: ${scoreResult.totalJDKeywords}`);

console.log(`  📊 Keyword Score: ${scoreResult.keywordScore}%`);
console.log(`  📊 Matched: ${scoreResult.matchedKeywords.slice(0, 10).join(', ')}`);
console.log(`  📊 Missing: ${scoreResult.missingKeywords.slice(0, 10).join(', ')}`);

// ── Test 3: Fallback Analysis ───────────────────────────────────────
console.log('\n🧪 Test 3: Fallback Analysis (non-AI)');
const fallback = fallbackAnalysis(MOCK_RESUME, MOCK_JD);
assert(typeof fallback.score === 'number', `Fallback score is a number: ${fallback.score}`);
assert(fallback.score >= 0 && fallback.score <= 100, `Fallback score in range: ${fallback.score}`);
assert(Array.isArray(fallback.suggestions), 'Suggestions is an array');
assert(fallback.suggestions.length > 0, `Has ${fallback.suggestions.length} suggestions`);
assert(Array.isArray(fallback.missing_skills), 'Missing skills is an array');
assert(Array.isArray(fallback.ats_tips), 'ATS tips is an array');

// ── Test 4: Score Merging ───────────────────────────────────────────
console.log('\n🧪 Test 4: Score Merging');
const merged = mergeScores(scoreResult, fallback);
assert(typeof merged.compositeScore === 'number', `Composite score: ${merged.compositeScore}`);
assert(merged.compositeScore >= 0 && merged.compositeScore <= 100, 'Composite score in range');
assert(merged.keywordScore === scoreResult.keywordScore, 'Keyword score preserved');
assert(Array.isArray(merged.suggestions), 'Merged suggestions is array');

// ── Test 5: Report Formatting ───────────────────────────────────────
console.log('\n🧪 Test 5: Report Formatting');
const report = formatReport(merged);
assert(typeof report === 'string', 'Report is a string');
assert(report.length > 100, `Report length: ${report.length} chars`);
assert(report.includes('Score'), 'Report contains "Score"');
assert(report.includes('Suggestion') || report.includes('suggestion'), 'Report contains suggestions section');

// ── Test 6: Edge Cases ──────────────────────────────────────────────
console.log('\n🧪 Test 6: Edge Cases');

const emptyScore = computeKeywordScore('', '');
assert(emptyScore.keywordScore === 0, 'Empty inputs score is 0');
assert(emptyScore.matchedKeywords.length === 0, 'Empty inputs: no matched keywords');

const shortResume = computeKeywordScore('hello world', MOCK_JD);
assert(shortResume.keywordScore >= 0, `Short resume score: ${shortResume.keywordScore}`);

const perfectMatch = computeKeywordScore(MOCK_JD, MOCK_JD);
assert(perfectMatch.keywordScore === 100, `Self-match score: ${perfectMatch.keywordScore}%`);

// ── Summary ─────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
console.log(`📋 Test Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(50));

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All tests passed!\n');
}
