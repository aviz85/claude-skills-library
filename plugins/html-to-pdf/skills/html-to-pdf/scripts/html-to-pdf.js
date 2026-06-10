#!/usr/bin/env node

/**
 * HTML to PDF Converter with Hebrew/RTL Support
 * Uses Puppeteer for pixel-perfect rendering
 *
 * Usage:
 *   node html-to-pdf.js <input> <output> [options]
 *
 * Input can be:
 *   - Local HTML file path
 *   - URL (http:// or https://)
 *   - "-" for stdin (pipe HTML content)
 *
 * Options:
 *   --format=<format>       Page format: A4, Letter, Legal, A3, A5 (default: A4)
 *   --landscape             Use landscape orientation
 *   --margin=<value>        Set all margins (e.g., "20mm" or "1in")
 *   --margin-top=<value>    Top margin
 *   --margin-right=<value>  Right margin
 *   --margin-bottom=<value> Bottom margin
 *   --margin-left=<value>   Left margin
 *   --scale=<number>        Scale factor 0.1-2.0 (default: 1)
 *   --background            Print background graphics (default: true)
 *   --no-background         Don't print background graphics
 *   --header=<html>         Header HTML template
 *   --footer=<html>         Footer HTML template
 *   --wait=<ms>             Additional wait time for fonts/JS (default: 1000)
 *   --rtl                   Force RTL direction
 *   --font=<path>           Load additional font file
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    format: 'A4',
    landscape: false,
    margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    scale: 1,
    printBackground: true,
    headerTemplate: '',
    footerTemplate: '',
    displayHeaderFooter: false,
    waitTime: 1000,
    forceRtl: false,
    additionalFonts: [],
    expectPages: 1  // Expected page count (0 = no check)
  };

  const positional = [];

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      switch (key) {
        case 'format':
          options.format = value;
          break;
        case 'landscape':
          options.landscape = true;
          break;
        case 'margin':
          options.margin = { top: value, right: value, bottom: value, left: value };
          break;
        case 'margin-top':
          options.margin.top = value;
          break;
        case 'margin-right':
          options.margin.right = value;
          break;
        case 'margin-bottom':
          options.margin.bottom = value;
          break;
        case 'margin-left':
          options.margin.left = value;
          break;
        case 'scale':
          options.scale = parseFloat(value);
          break;
        case 'background':
          options.printBackground = true;
          break;
        case 'no-background':
          options.printBackground = false;
          break;
        case 'header':
          options.headerTemplate = value;
          options.displayHeaderFooter = true;
          break;
        case 'footer':
          options.footerTemplate = value;
          options.displayHeaderFooter = true;
          break;
        case 'wait':
          options.waitTime = parseInt(value, 10);
          break;
        case 'rtl':
          options.forceRtl = true;
          break;
        case 'font':
          options.additionalFonts.push(value);
          break;
        case 'expect-pages':
          options.expectPages = parseInt(value, 10);
          break;
        case 'no-page-check':
          options.expectPages = 0;
          break;
      }
    } else {
      positional.push(arg);
    }
  }

  options.input = positional[0];
  options.output = positional[1];

  return options;
}

// Check PDF page count using pdfinfo
function checkPdfPageCount(pdfPath, expectedPages) {
  if (expectedPages <= 0) return { ok: true, pages: 0 };

  try {
    const output = execSync(`pdfinfo "${pdfPath}" 2>&1`, { encoding: 'utf8' });
    const match = output.match(/Pages:\s*(\d+)/);
    const pages = match ? parseInt(match[1], 10) : 0;

    if (pages === 0) {
      // Could not parse, skip check
      return { ok: true, pages: 0, skipped: true };
    }

    return {
      ok: pages === expectedPages,
      pages,
      expected: expectedPages
    };
  } catch (e) {
    // pdfinfo not available, skip check
    return { ok: true, pages: 0, skipped: true };
  }
}

// Detect if content contains RTL characters (Hebrew, Arabic)
function containsRtlCharacters(text) {
  // Hebrew: \u0590-\u05FF, Arabic: \u0600-\u06FF, \u0750-\u077F
  const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
  return rtlPattern.test(text);
}

// Read input from file, URL, or stdin
async function getInputContent(input) {
  if (input === '-') {
    // Read from stdin
    return new Promise((resolve, reject) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', chunk => data += chunk);
      process.stdin.on('end', () => resolve({ type: 'html', content: data }));
      process.stdin.on('error', reject);
    });
  } else if (input.startsWith('http://') || input.startsWith('https://')) {
    return { type: 'url', content: input };
  } else {
    const absolutePath = path.resolve(input);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }
    return { type: 'file', content: absolutePath };
  }
}

// CSS to inject for proper RTL and font support
function getRtlCss(forceRtl) {
  return `
    /* Hebrew/RTL Support CSS */
    @font-face {
      font-family: 'Noto Sans Hebrew';
      src: local('Noto Sans Hebrew'), local('NotoSansHebrew');
      unicode-range: U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F;
    }

    /* Ensure proper RTL handling */
    [lang="he"], [lang="iw"], [dir="rtl"], .rtl {
      direction: rtl;
      text-align: right;
    }

    /* Auto-detect RTL content */
    :lang(he), :lang(iw), :lang(ar) {
      direction: rtl;
      text-align: right;
    }

    ${forceRtl ? `
    html, body {
      direction: rtl;
      text-align: right;
    }
    ` : ''}

    /* Improve print quality */
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
}

async function convertHtmlToPdf(options) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-font-subpixel-positioning'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });

    // Get input content
    const input = await getInputContent(options.input);

    // Navigate to content
    if (input.type === 'url') {
      await page.goto(input.content, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    } else if (input.type === 'file') {
      await page.goto(`file://${input.content}`, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    } else {
      await page.setContent(input.content, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    }

    // Inject RTL/font support CSS
    await page.addStyleTag({ content: getRtlCss(options.forceRtl) });

    // Auto-detect RTL content and set direction if needed
    const pageContent = await page.content();
    const hasRtl = containsRtlCharacters(pageContent);

    if (hasRtl || options.forceRtl) {
      await page.evaluate(() => {
        // Check if already has direction set
        const html = document.documentElement;
        const body = document.body;

        if (!html.getAttribute('dir') && !body.getAttribute('dir')) {
          // Auto-set RTL for Hebrew content
          const text = body.innerText || '';
          const hebrewPattern = /[\u0590-\u05FF]/;
          if (hebrewPattern.test(text)) {
            html.setAttribute('dir', 'rtl');
            html.setAttribute('lang', 'he');
          }
        }
      });
    }

    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Additional wait for complex content/fonts
    if (options.waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, options.waitTime));
    }

    // Add clean page-break rules for all documents
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
        tr, img, figure, blockquote, pre, .no-break { page-break-inside: avoid; }
        table { page-break-inside: auto; }
        p { orphans: 3; widows: 3; }
      `;
      document.head.appendChild(style);
    });

    // Generate PDF
    const pdfOptions = {
      path: options.output,
      format: options.format,
      landscape: options.landscape,
      margin: options.margin,
      scale: options.scale,
      printBackground: options.printBackground,
      displayHeaderFooter: options.displayHeaderFooter,
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate,
      preferCSSPageSize: true
    };

    await page.pdf(pdfOptions);

    console.log(`PDF generated successfully: ${options.output}`);

    // Auto-fit: if PDF has 2 pages but expected 1, try CSS zoom to fit
    const pageCheck = checkPdfPageCount(options.output, options.expectPages);
    if (!pageCheck.skipped && pageCheck.pages === 2 && options.expectPages === 1) {
      // Use CSS zoom (affects layout reflow in Chromium, RTL-safe)
      const zoomLevels = [0.92, 0.88, 0.84, 0.80, 0.75];
      for (const z of zoomLevels) {
        await page.evaluate((zoom) => {
          // Remove previous auto-fit
          const prev = document.getElementById('autofit-zoom');
          if (prev) prev.remove();
          const style = document.createElement('style');
          style.id = 'autofit-zoom';
          style.textContent = `
            html { zoom: ${zoom}; }
            body { max-width: 100%; overflow: hidden; box-sizing: border-box; }
          `;
          document.head.appendChild(style);
        }, z);
        await page.pdf(pdfOptions);
        const recheck = checkPdfPageCount(options.output, 1);
        if (!recheck.skipped && recheck.pages === 1) {
          console.log(`Auto-fit: shrunk to ${Math.round(z * 100)}% (CSS zoom) to fit 1 page`);
          return { success: true, pages: 1, overflow: false };
        }
      }
      // If still 2 pages, reset zoom and keep original
      await page.evaluate(() => {
        const prev = document.getElementById('autofit-zoom');
        if (prev) prev.remove();
      });
      await page.pdf(pdfOptions);
      console.log('Auto-fit: could not fit to 1 page (content too large), kept at 2 pages');
    }

    // Check page count for warnings
    if (pageCheck.skipped) {
      // pdfinfo not available, skip
    } else if (!pageCheck.ok) {
      console.log('');
      if (pageCheck.pages > pageCheck.expected) {
        console.log('⚠️  WARNING: PAGE OVERFLOW DETECTED!');
        console.log(`   Expected: ${pageCheck.expected} page(s)`);
        console.log(`   Actual:   ${pageCheck.pages} page(s)`);
        console.log('');
        console.log('   Fix: Reduce content, margins, or font sizes in HTML');
      } else {
        console.log('⚠️  WARNING: Page count mismatch');
        console.log(`   Expected: ${pageCheck.expected} page(s)`);
        console.log(`   Actual:   ${pageCheck.pages} page(s)`);
      }
      console.log('   Use --no-page-check to disable this warning');
      console.log('');
    }

    return { success: true, pages: pageCheck.pages, overflow: !pageCheck.ok };

  } finally {
    await browser.close();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`
HTML to PDF Converter with Hebrew/RTL Support
==============================================

Usage:
  html-to-pdf <input> <output.pdf> [options]

Input:
  - Local HTML file path
  - URL (http:// or https://)
  - "-" for stdin (pipe HTML content)

Options:
  --format=<format>       Page format: A4, Letter, Legal, A3, A5 (default: A4)
  --landscape             Use landscape orientation
  --margin=<value>        Set all margins (e.g., "20mm" or "1in")
  --margin-top=<value>    Top margin
  --margin-right=<value>  Right margin
  --margin-bottom=<value> Bottom margin
  --margin-left=<value>   Left margin
  --scale=<number>        Scale factor 0.1-2.0 (default: 1)
  --background            Print background graphics (default: true)
  --no-background         Don't print background graphics
  --header=<html>         Header HTML template
  --footer=<html>         Footer HTML template
  --wait=<ms>             Additional wait time for fonts/JS (default: 1000)
  --rtl                   Force RTL direction for entire document
  --expect-pages=<N>      Expected page count, warns if different (default: 1)
  --no-page-check         Disable page count warning

Examples:
  # Convert local HTML file
  html-to-pdf document.html output.pdf

  # Convert URL to PDF
  html-to-pdf https://example.com page.pdf

  # Hebrew document with forced RTL
  html-to-pdf hebrew.html hebrew.pdf --rtl

  # Custom margins and format
  html-to-pdf doc.html out.pdf --format=Letter --margin=1in

  # Pipe HTML content
  echo "<h1>שלום עולם</h1>" | html-to-pdf - hello.pdf --rtl
`);
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const options = parseArgs(args);

  if (!options.input || !options.output) {
    console.error('Error: Both input and output are required');
    process.exit(1);
  }

  try {
    await convertHtmlToPdf(options);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
