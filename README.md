# 🎯 ResumeAlign Bot

> **AI-Powered Telegram Resume Analyzer & Optimizer**

ResumeAlign Bot is a production-ready Telegram bot that helps job seekers optimize their resumes for specific job descriptions. Upload your resume, paste a job description, and get instant AI-powered analysis with a match score, missing skills, actionable suggestions, and a fully rewritten ATS-optimized resume — delivered as downloadable PDF and DOCX files.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📊 **Match Score (0–100)** | Composite score combining keyword matching (30%) and AI semantic analysis (70%) |
| 📈 **Score Breakdown** | Detailed sub-scores for skills, experience, education, keywords & presentation |
| ❌ **Gap Analysis** | Identifies missing skills, keywords, and experience gaps vs. the JD |
| ✅ **Skill Matching** | Highlights what you already have that matches the role |
| 💡 **Improvement Suggestions** | Specific, actionable recommendations to boost ATS compatibility |
| 📝 **AI Resume Rewriting** | Generates an optimized version of your resume tailored to the JD |
| 📄 **PDF & DOCX Export** | Download your improved resume in both formats instantly |
| 🤖 **ATS Tips** | Formatting and content tips for Applicant Tracking Systems |
| 🔄 **Auto-Retry & Fallback** | Retries on rate limits, tries multiple AI models, and falls back to keyword analysis |

---

## 🛠️ Tech Stack & Dependencies

### Core Runtime & Server

| Package | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | JavaScript runtime for the backend |
| **Express.js** | ^4.21.1 | HTTP web server for REST API endpoints and health checks |
| **dotenv** | ^16.4.5 | Loads `.env` file variables into `process.env` for configuration |

### Telegram Bot

| Package | Version | Purpose |
|---|---|---|
| **Telegraf** | ^4.16.3 | Modern Telegram Bot framework — handles commands, messages, file uploads, and bot lifecycle |

### AI & Language Models

| Package | Version | Purpose |
|---|---|---|
| **openai** | ^4.73.1 | OpenAI-compatible SDK — used to call Groq's API (Llama 3.3 70B) for resume analysis and rewriting |
| **@google/generative-ai** | ^0.24.1 | Google Gemini SDK (available as alternative AI backend) |

### File Parsing (Resume Input)

| Package | Version | Purpose |
|---|---|---|
| **pdf-parse** | ^1.1.1 | Extracts raw text content from uploaded PDF resume files |
| **mammoth** | ^1.8.0 | Extracts raw text content from uploaded DOCX resume files |

### Resume Generation (Output)

| Package | Version | Purpose |
|---|---|---|
| **puppeteer** | ^23.6.0 | Headless Chrome browser — renders HTML resume template into a professional PDF file |
| **docx** | ^9.1.1 | Programmatically generates `.docx` files with formatted sections, headings, and bullet points |

### Networking & File Handling

| Package | Version | Purpose |
|---|---|---|
| **axios** | ^1.7.7 | HTTP client — downloads uploaded files from Telegram's servers |
| **uuid** | ^11.0.3 | Generates unique filenames for temporary resume and output files |

### Logging & Monitoring

| Package | Version | Purpose |
|---|---|---|
| **winston** | ^3.17.0 | Structured logging with console + file transports, timestamps, and log levels |

### Database (Optional)

| Package | Version | Purpose |
|---|---|---|
| **mongoose** | ^8.8.3 | MongoDB ODM — optional persistent storage for user sessions and analysis history |

### Development Tools

| Package | Version | Purpose |
|---|---|---|
| **nodemon** | ^3.1.7 | Auto-restarts the server on file changes during development (`npm run dev`) |

---

## 📁 Project Structure

```
resume-align-bot/
├── src/
│   ├── app.js                         # Entry point — Express + Bot bootstrap
│   ├── bot/
│   │   ├── bot.js                     # Telegraf bot setup & launch
│   │   └── handlers.js                # Conversation state machine & handlers
│   ├── controllers/
│   │   └── resumeController.js        # 5-step processing pipeline orchestration
│   ├── services/
│   │   ├── parserService.js           # PDF & DOCX text extraction
│   │   ├── aiService.js               # Groq/AI integration with retry & fallback
│   │   ├── scoringService.js          # Keyword matching & composite scoring
│   │   └── resumeBuilder.js           # PDF & DOCX resume generation
│   ├── utils/
│   │   ├── fileHandler.js             # File download, temp storage & cleanup
│   │   └── logger.js                  # Winston-based structured logging
│   ├── templates/
│   │   └── resumeTemplate.html        # Professional HTML template for PDF output
│   └── routes/
│       └── apiRoutes.js               # Optional REST API endpoints
├── tests/
│   └── mockTest.js                    # 29 unit tests (no API keys needed)
├── package.json
├── .env                               # Environment variables (DO NOT commit)
├── .env.example                       # Template for env vars (safe to commit)
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A **Telegram Bot Token** — from [@BotFather](https://t.me/BotFather)
- A **Groq API Key** (free) — from [console.groq.com/keys](https://console.groq.com/keys)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd resume-align-bot
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Groq API Key (FREE — from https://console.groq.com/keys)
GROQ_API_KEY=your_groq_api_key

# AI Model (default: llama-3.3-70b-versatile)
AI_MODEL=llama-3.3-70b-versatile

# Server Port
PORT=3000

# Logging Level
LOG_LEVEL=info

# Temp directory
TEMP_DIR=./temp
```

### 3. Run

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### 4. Test (no API keys needed)

```bash
npm test
```

---

## 🤖 How to Get API Keys

### Telegram Bot Token
1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g., `ResumeAlign Bot`)
4. Choose a username ending in `bot` (e.g., `resume_align_bot`)
5. Copy the token — paste into `.env` as `TELEGRAM_BOT_TOKEN`

### Groq API Key (Free)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (free, no credit card)
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key — paste into `.env` as `GROQ_API_KEY`

> **Groq Free Tier:** 30 requests/min, 6,000 requests/day — more than enough for personal use.

---

## 💬 Bot Commands

| Command | Description |
|---|---|
| `/start` | Welcome message with feature overview |
| `/analyze` | Start a new resume analysis |
| `/help` | Detailed help and usage instructions |
| `/cancel` | Cancel the current operation |

---

## 📋 User Flow

```
User: /analyze
Bot:  📎 Upload your resume (PDF or DOCX)

User: [uploads resume.pdf]
Bot:  ✅ Resume received! Now paste the Job Description.

User: [pastes full job description text]
Bot:  ⏳ Analyzing... (30-60 seconds)

Bot:  🟢 Resume Match Score: 78/100
      ├ Keyword Match: 72%
      ├ AI Semantic Score: 81%
      ├ Skills Match: 85%
      ├ Experience Relevance: 75%
      ├ Education Fit: 70%
      └ Presentation: 80%
      
      ✅ Matching Skills: Python, Machine Learning, Docker...
      ❌ Missing Skills: Terraform, Kafka, Datadog...
      💡 Suggestions: Add quantified achievements...
      🤖 ATS Tips: Use standard headings...

Bot:  📄 [improved_resume.pdf]
Bot:  📝 [improved_resume.docx]
```

---

## ⚙️ Processing Pipeline

The bot executes a 5-step pipeline for each analysis:

```
Step 1: Parse Resume     → Extract text from PDF/DOCX
Step 2: Keyword Scoring  → Match JD keywords against resume
Step 3: AI Analysis      → Semantic evaluation via Groq (Llama 3.3 70B)
Step 4: Merge Scores     → Composite score (30% keyword + 70% AI)
Step 5: Generate Files   → Rewrite resume → PDF + DOCX output
```

### AI Model Fallback Chain
If the primary model is rate-limited, the bot automatically tries:
1. `llama-3.3-70b-versatile` (primary — best quality)
2. `llama-3.1-8b-instant` (fast fallback)
3. `gemma2-9b-it` (alternative fallback)
4. Keyword-only analysis (no AI, last resort)

---

## 🔌 REST API (Optional)

The bot also exposes HTTP endpoints for programmatic access:

### Health Check
```http
GET /health
→ {"status":"ok","uptime":123.45}
```

### API Status
```http
GET /api/status
→ {"status":"online","service":"ResumeAlign Bot API","version":"1.0.0"}
```

### Full Analysis (text-based)
```http
POST /api/analyze
Content-Type: application/json

{
  "resumeText": "John Smith\nSoftware Engineer...",
  "jdText": "We are looking for a Senior Developer..."
}
```

### Keyword Score Only (lightweight)
```http
POST /api/score
Content-Type: application/json

{
  "resumeText": "...",
  "jdText": "..."
}
```

---

## 📊 Scoring Methodology

| Component | Weight | Method |
|---|---|---|
| **Keyword Match** | 30% | Direct keyword extraction and matching |
| **AI Semantic Score** | 70% | Contextual evaluation by Llama 3.3 70B |

### Score Breakdown Categories

| Category | What It Measures |
|---|---|
| Skills Match | Technical and soft skill alignment |
| Experience Relevance | How well work history matches requirements |
| Education Fit | Degree, certifications, educational requirements |
| Keyword Optimization | ATS keyword coverage |
| Overall Presentation | Format, clarity, professionalism |

---

## 🧪 Testing

Run the test suite (no API keys required):

```bash
npm test
```

**29 tests** covering:
- ✅ Keyword extraction from job descriptions
- ✅ Keyword matching and scoring
- ✅ Fallback analysis (non-AI)
- ✅ Score merging (keyword + AI composite)
- ✅ Report formatting for Telegram
- ✅ Edge cases (empty inputs, short text, self-matching)

---

## 🛡️ Error Handling

| Scenario | Bot Behavior |
|---|---|
| Invalid file format | Notified, asked to re-upload (PDF/DOCX only) |
| File too large (>20MB) | Rejected with helpful message |
| Empty/unreadable resume | Error with guidance to re-upload |
| JD too short (<30 chars) | Asked to paste the full JD |
| AI rate limited | Auto-retries with backoff, tries alternate models |
| All AI models fail | Falls back to keyword-only analysis |
| Resume rewriting fails | Uses original resume text for file generation |
| Unexpected error | Generic error + restart suggestion |

---

## 🔧 Configuration Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Bot token from @BotFather |
| `GROQ_API_KEY` | ✅ | — | Free API key from console.groq.com |
| `AI_MODEL` | ❌ | `llama-3.3-70b-versatile` | Primary AI model |
| `PORT` | ❌ | `3000` | Express server port |
| `MONGODB_URI` | ❌ | — | MongoDB URI (optional) |
| `LOG_LEVEL` | ❌ | `info` | Logging: error/warn/info/debug |
| `TEMP_DIR` | ❌ | `./temp` | Temporary file directory |

---

## 📂 Key Files

| File | Purpose |
|---|---|
| `src/app.js` | Application entry point |
| `src/bot/handlers.js` | Telegram conversation flow (state machine) |
| `src/services/aiService.js` | Groq AI integration with retry & model fallback |
| `src/services/scoringService.js` | Keyword extraction, matching & composite scoring |
| `src/services/resumeBuilder.js` | PDF (Puppeteer) & DOCX generation |
| `src/services/parserService.js` | PDF & DOCX text extraction |
| `src/controllers/resumeController.js` | 5-step pipeline orchestration |
| `src/templates/resumeTemplate.html` | Professional HTML resume template |

---

## 📜 License

MIT License
