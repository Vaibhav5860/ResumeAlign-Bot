/**
 * ============================================
 * Resume Builder Service
 * ============================================
 * 
 * Generates optimized resume files in PDF and DOCX
 * formats from the AI-rewritten resume text.
 * 
 * - PDF: HTML template → Puppeteer → PDF
 * - DOCX: docx library → .docx file
 */

const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = require('docx');
const logger = require('../utils/logger');

const TEMP_DIR     = path.resolve(process.env.TEMP_DIR || './temp');
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates');

/**
 * Load and populate the HTML resume template.
 * 
 * @param {string} resumeText — The rewritten resume text
 * @param {Object} analysis   — The analysis result for metadata
 * @returns {string} — Fully rendered HTML string
 */
function buildHTML(resumeText, analysis = {}) {
  const templatePath = path.join(TEMPLATE_DIR, 'resumeTemplate.html');
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Parse the resume text into sections
  const sections = parseResumeIntoSections(resumeText);

  // Build the body content
  let bodyContent = '';

  for (const section of sections) {
    if (section.heading) {
      bodyContent += `<div class="section">
        <h2 class="section-title">${escapeHtml(section.heading)}</h2>
        <div class="section-content">`;

      for (const line of section.lines) {
        if (line.trim().startsWith('•') || line.trim().startsWith('-') || line.trim().startsWith('–')) {
          bodyContent += `<div class="bullet-item">${escapeHtml(line.trim())}</div>`;
        } else if (line.trim()) {
          bodyContent += `<p>${escapeHtml(line.trim())}</p>`;
        }
      }

      bodyContent += `</div></div>`;
    } else {
      // Content before any heading (name / contact info)
      for (const line of section.lines) {
        if (section.lines.indexOf(line) === 0 && !section.heading) {
          bodyContent += `<h1 class="name">${escapeHtml(line.trim())}</h1>`;
        } else if (line.trim()) {
          bodyContent += `<p class="contact-info">${escapeHtml(line.trim())}</p>`;
        }
      }
    }
  }

  // Replace placeholder in template
  html = html.replace('{{RESUME_CONTENT}}', bodyContent);
  html = html.replace('{{SCORE}}', analysis.compositeScore || 'N/A');

  return html;
}

/**
 * Parse resume text into logical sections based on headings.
 */
function parseResumeIntoSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = { heading: null, lines: [] };

  for (const line of lines) {
    // Detect section headings (all caps lines or lines with common heading patterns)
    const trimmed = line.trim();
    if (
      trimmed &&
      (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && /[A-Z]/.test(trimmed)) ||
      /^(PROFESSIONAL SUMMARY|SKILLS|EXPERIENCE|PROFESSIONAL EXPERIENCE|EDUCATION|CERTIFICATIONS|PROJECTS|AWARDS|OBJECTIVE|CONTACT)/i.test(trimmed)
    ) {
      if (currentSection.lines.length > 0 || currentSection.heading) {
        sections.push(currentSection);
      }
      currentSection = { heading: trimmed, lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }

  if (currentSection.lines.length > 0 || currentSection.heading) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Generate a PDF from the rewritten resume.
 * 
 * @param {string} resumeText — AI-rewritten resume
 * @param {Object} analysis   — Analysis result (for metadata)
 * @returns {Promise<string>} — Path to generated PDF file
 */
async function generatePDF(resumeText, analysis = {}) {
  const html     = buildHTML(resumeText, analysis);
  const filename = `improved_resume_${uuidv4().slice(0, 8)}.pdf`;
  const filePath = path.join(TEMP_DIR, filename);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    await page.pdf({
      path: filePath,
      format: 'A4',
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      printBackground: true,
    });

    logger.info(`Generated PDF: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.error(`PDF generation failed: ${err.message}`);
    throw new Error(`Could not generate PDF: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Generate a DOCX from the rewritten resume.
 * 
 * @param {string} resumeText — AI-rewritten resume
 * @param {Object} analysis   — Analysis result
 * @returns {Promise<string>} — Path to generated DOCX file
 */
async function generateDOCX(resumeText, analysis = {}) {
  const filename = `improved_resume_${uuidv4().slice(0, 8)}.docx`;
  const filePath = path.join(TEMP_DIR, filename);

  try {
    const sections = parseResumeIntoSections(resumeText);
    const docChildren = [];

    for (const section of sections) {
      if (section.heading) {
        // Section heading
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: section.heading,
                bold: true,
                size: 26,
                font: 'Calibri',
                color: '1a365d',
              }),
            ],
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
            border: {
              bottom: {
                color: '2b6cb0',
                size: 1,
                style: BorderStyle.SINGLE,
                space: 1,
              },
            },
          })
        );

        // Section content
        for (const line of section.lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('–');

          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: isBullet ? trimmed.replace(/^[•\-–]\s*/, '') : trimmed,
                  size: 22,
                  font: 'Calibri',
                }),
              ],
              bullet: isBullet ? { level: 0 } : undefined,
              spacing: { after: 60 },
            })
          );
        }
      } else {
        // Header section (name, contact)
        for (let i = 0; i < section.lines.length; i++) {
          const line = section.lines[i].trim();
          if (!line) continue;

          if (i === 0) {
            // Name
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    bold: true,
                    size: 36,
                    font: 'Calibri',
                    color: '1a365d',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
              })
            );
          } else {
            // Contact info
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 20,
                    font: 'Calibri',
                    color: '4a5568',
                  }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 40 },
              })
            );
          }
        }
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720,
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(filePath, buffer);

    logger.info(`Generated DOCX: ${filePath}`);
    return filePath;
  } catch (err) {
    logger.error(`DOCX generation failed: ${err.message}`);
    throw new Error(`Could not generate DOCX: ${err.message}`);
  }
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  generatePDF,
  generateDOCX,
  buildHTML,
};
