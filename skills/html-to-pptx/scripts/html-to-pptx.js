#!/usr/bin/env node

/**
 * HTML to PowerPoint Converter with Hebrew/RTL Support
 * Uses PptxGenJS for generation and Puppeteer for complex HTML rendering
 *
 * Usage:
 *   node html-to-pptx.js <input> <output.pptx> [options]
 *
 * Input can be:
 *   - Local HTML file path
 *   - URL (http:// or https://)
 *   - "-" for stdin (pipe HTML content)
 *
 * Options:
 *   --mode=<mode>           Conversion mode: text, image, slides (default: auto)
 *   --rtl                   Force RTL direction
 *   --title=<title>         Presentation title
 *   --author=<author>       Presentation author
 *   --subject=<subject>     Presentation subject
 *   --layout=<layout>       Slide layout: LAYOUT_16x9, LAYOUT_4x3, LAYOUT_WIDE (default: LAYOUT_16x9)
 *   --font=<font>           Default font (default: Heebo for Hebrew, Arial otherwise)
 *   --font-size=<size>      Default font size in points (default: 18)
 *   --background=<color>    Background color (hex without #, e.g., FFFFFF)
 *   --slide-per=<selector>  Create new slide for each matching element
 *   --wait=<ms>             Wait time for page rendering (default: 2000)
 */

const pptxgen = require('pptxgenjs');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Dynamic imports for ES modules
let html2pptxgenjs;
let puppeteer;

// Parse command line arguments
function parseArgs(args) {
  const options = {
    input: null,
    output: null,
    mode: 'auto', // 'text', 'image', 'slides', 'auto'
    forceRtl: false,
    title: '',
    author: 'AVIZ',
    subject: '',
    layout: 'LAYOUT_16x9',
    font: null, // auto-detect
    fontSize: 18,
    background: null,
    slidePerSelector: null,
    waitTime: 2000,
  };

  const positional = [];

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');

      switch (key) {
        case 'mode':
          options.mode = value;
          break;
        case 'rtl':
          options.forceRtl = true;
          break;
        case 'title':
          options.title = value;
          break;
        case 'author':
          options.author = value;
          break;
        case 'subject':
          options.subject = value;
          break;
        case 'layout':
          options.layout = value;
          break;
        case 'font':
          options.font = value;
          break;
        case 'font-size':
          options.fontSize = parseInt(value, 10);
          break;
        case 'background':
          options.background = value;
          break;
        case 'slide-per':
          options.slidePerSelector = value;
          break;
        case 'wait':
          options.waitTime = parseInt(value, 10);
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

// Detect if content contains RTL characters (Hebrew, Arabic)
function containsRtlCharacters(text) {
  const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/;
  return rtlPattern.test(text);
}

// Read input from file, URL, or stdin
async function getInputContent(input) {
  if (input === '-') {
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
    const content = fs.readFileSync(absolutePath, 'utf8');
    return { type: 'file', content, path: absolutePath };
  }
}

// Extract text content from HTML with formatting
function extractTextFromHtml(html, options) {
  const $ = cheerio.load(html);
  const slides = [];
  const isRtl = options.forceRtl || containsRtlCharacters($.text());

  // Remove script and style tags
  $('script, style, noscript').remove();

  // If slide-per selector is provided, split by that
  if (options.slidePerSelector) {
    $(options.slidePerSelector).each((i, elem) => {
      const slideContent = extractElementContent($, $(elem), isRtl, options);
      if (slideContent.length > 0) {
        slides.push({
          title: $(elem).find('h1, h2, h3').first().text().trim() || `Slide ${i + 1}`,
          content: slideContent,
          isRtl
        });
      }
    });
  } else {
    // Try to split by common slide markers
    const slideMarkers = ['section', 'article', '.slide', '[data-slide]', 'hr'];
    let foundMarker = false;

    for (const marker of slideMarkers) {
      if ($(marker).length > 1) {
        $(marker).each((i, elem) => {
          const slideContent = extractElementContent($, $(elem), isRtl, options);
          if (slideContent.length > 0) {
            slides.push({
              title: $(elem).find('h1, h2, h3').first().text().trim() || `Slide ${i + 1}`,
              content: slideContent,
              isRtl
            });
          }
        });
        foundMarker = true;
        break;
      }
    }

    // If no markers found, create slides by headings
    if (!foundMarker) {
      const content = extractElementContent($, $('body'), isRtl, options);
      if (content.length > 0) {
        slides.push({
          title: $('title').text().trim() || $('h1').first().text().trim() || 'Presentation',
          content,
          isRtl
        });
      }
    }
  }

  return slides;
}

// Extract content from a single element
function extractElementContent($, $elem, isRtl, options) {
  const content = [];
  const font = options.font || (isRtl ? 'Heebo' : 'Arial');

  // Process headings
  $elem.find('h1, h2, h3, h4, h5, h6').each((i, heading) => {
    const $heading = $(heading);
    const level = parseInt(heading.tagName.substring(1));
    const fontSize = Math.max(24, 44 - (level * 6));

    content.push({
      type: 'heading',
      text: $heading.text().trim(),
      level,
      options: {
        fontSize,
        bold: true,
        fontFace: font,
        rtlMode: isRtl,
        align: isRtl ? 'right' : 'left',
        color: '363636',
        breakLine: true
      }
    });
  });

  // Process paragraphs
  $elem.find('p').each((i, para) => {
    const text = $(para).text().trim();
    if (text) {
      content.push({
        type: 'paragraph',
        text,
        options: {
          fontSize: options.fontSize,
          fontFace: font,
          rtlMode: isRtl,
          align: isRtl ? 'right' : 'left',
          color: '404040',
          breakLine: true
        }
      });
    }
  });

  // Process lists
  $elem.find('ul, ol').each((i, list) => {
    const $list = $(list);
    const isOrdered = list.tagName === 'OL';

    $list.children('li').each((j, li) => {
      const text = $(li).text().trim();
      if (text) {
        content.push({
          type: 'bullet',
          text,
          ordered: isOrdered,
          index: j + 1,
          options: {
            fontSize: options.fontSize,
            fontFace: font,
            rtlMode: isRtl,
            align: isRtl ? 'right' : 'left',
            color: '404040',
            bullet: isOrdered ? { type: 'number' } : { type: 'bullet' },
            indentLevel: 0
          }
        });
      }
    });
  });

  // Process images
  $elem.find('img').each((i, img) => {
    const $img = $(img);
    let src = $img.attr('src');

    if (src && !src.startsWith('data:')) {
      content.push({
        type: 'image',
        src,
        alt: $img.attr('alt') || '',
        options: {}
      });
    }
  });

  // If no structured content found, get raw text
  if (content.length === 0) {
    const text = $elem.text().trim();
    if (text) {
      content.push({
        type: 'paragraph',
        text,
        options: {
          fontSize: options.fontSize,
          fontFace: font,
          rtlMode: isRtl,
          align: isRtl ? 'right' : 'left',
          color: '404040'
        }
      });
    }
  }

  return content;
}

// Convert using text mode (parse HTML and create native PPTX elements)
async function convertTextMode(html, options) {
  const pptx = new pptxgen();
  const slides = extractTextFromHtml(html, options);
  const isRtl = options.forceRtl || containsRtlCharacters(html);

  // Set presentation properties
  pptx.author = options.author;
  pptx.title = options.title || slides[0]?.title || 'Presentation';
  pptx.subject = options.subject;
  pptx.layout = options.layout;

  // Enable RTL mode globally if needed
  if (isRtl) {
    pptx.rtlMode = true;
  }

  // Set default font
  const defaultFont = options.font || (isRtl ? 'Heebo' : 'Arial');

  for (const slideData of slides) {
    const slide = pptx.addSlide();

    // Set background if specified
    if (options.background) {
      slide.background = { color: options.background };
    }

    let yPos = 0.5;
    const xPos = isRtl ? 0.5 : 0.5;
    const width = 9;
    const maxY = 5.5;

    // Add title
    if (slideData.title) {
      slide.addText(slideData.title, {
        x: xPos,
        y: yPos,
        w: width,
        h: 0.75,
        fontSize: 32,
        bold: true,
        fontFace: defaultFont,
        color: '363636',
        align: isRtl ? 'right' : 'left',
        rtlMode: isRtl
      });
      yPos += 1;
    }

    // Add content
    const textContent = [];

    for (const item of slideData.content) {
      if (item.type === 'heading') {
        // Skip if it's the same as the title
        if (item.text !== slideData.title) {
          textContent.push({
            text: item.text,
            options: { ...item.options, breakLine: true, paraSpaceAfter: 12 }
          });
        }
      } else if (item.type === 'paragraph') {
        textContent.push({
          text: item.text,
          options: { ...item.options, breakLine: true, paraSpaceAfter: 8 }
        });
      } else if (item.type === 'bullet') {
        textContent.push({
          text: item.text,
          options: {
            ...item.options,
            breakLine: true,
            bullet: item.ordered ? { type: 'number' } : true,
            paraSpaceAfter: 4
          }
        });
      } else if (item.type === 'image') {
        // Add accumulated text first
        if (textContent.length > 0) {
          slide.addText(textContent, {
            x: xPos,
            y: yPos,
            w: width,
            h: maxY - yPos,
            valign: 'top',
            rtlMode: isRtl
          });
          textContent.length = 0;
        }
      }
    }

    // Add remaining text content
    if (textContent.length > 0) {
      slide.addText(textContent, {
        x: xPos,
        y: yPos,
        w: width,
        h: maxY - yPos,
        valign: 'top',
        rtlMode: isRtl
      });
    }
  }

  // If no slides were created, add a placeholder
  if (slides.length === 0) {
    const slide = pptx.addSlide();
    slide.addText('No content found', {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1,
      fontSize: 24,
      align: 'center',
      color: '808080'
    });
  }

  return pptx;
}

// Convert using image mode (screenshot HTML and embed as image)
async function convertImageMode(inputData, options) {
  if (!puppeteer) {
    puppeteer = require('puppeteer');
  }

  const pptx = new pptxgen();
  const isRtl = options.forceRtl;

  pptx.author = options.author;
  pptx.title = options.title || 'Presentation';
  pptx.subject = options.subject;
  pptx.layout = options.layout;

  if (isRtl) {
    pptx.rtlMode = true;
  }

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

    // Set viewport to 16:9 aspect ratio
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

    // Navigate to content
    if (inputData.type === 'url') {
      await page.goto(inputData.content, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    } else if (inputData.type === 'file') {
      await page.goto(`file://${inputData.path}`, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    } else {
      await page.setContent(inputData.content, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
    }

    // Wait for fonts
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, options.waitTime));

    // Try to find slide sections first
    const slideSelector = options.slidePerSelector || 'section, article, .slide, [data-slide]';
    const sections = await page.$$eval(slideSelector, elements =>
      elements.map(el => ({
        top: el.getBoundingClientRect().top + window.scrollY,
        height: el.getBoundingClientRect().height,
        width: el.getBoundingClientRect().width
      }))
    );

    if (sections.length > 1) {
      // Screenshot each section separately
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        // Scroll to section
        await page.evaluate((y) => window.scrollTo(0, y), section.top);
        await new Promise(resolve => setTimeout(resolve, 300));

        const screenshot = await page.screenshot({
          type: 'png',
          clip: {
            x: 0,
            y: 0,
            width: Math.min(section.width || 1920, 1920),
            height: Math.min(section.height || 1080, 1080)
          }
        });

        const slide = pptx.addSlide();

        if (options.background) {
          slide.background = { color: options.background };
        }

        const base64 = screenshot.toString('base64');
        slide.addImage({
          data: `image/png;base64,${base64}`,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          sizing: { type: 'contain', w: '100%', h: '100%' }
        });
      }
    } else {
      // Fallback: split by viewport height
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }));

      const slideHeight = 1080;
      const numSlides = Math.max(1, Math.ceil(dimensions.height / slideHeight));

      for (let i = 0; i < numSlides; i++) {
        await page.evaluate((y) => window.scrollTo(0, y), i * slideHeight);
        await new Promise(resolve => setTimeout(resolve, 200));

        const screenshot = await page.screenshot({
          type: 'png',
          clip: {
            x: 0,
            y: 0,
            width: Math.min(dimensions.width, 1920),
            height: Math.min(slideHeight, dimensions.height - i * slideHeight)
          }
        });

        const slide = pptx.addSlide();

        if (options.background) {
          slide.background = { color: options.background };
        }

        const base64 = screenshot.toString('base64');
        slide.addImage({
          data: `image/png;base64,${base64}`,
          x: 0,
          y: 0,
          w: '100%',
          h: '100%',
          sizing: { type: 'contain', w: '100%', h: '100%' }
        });
      }
    }
  } finally {
    await browser.close();
  }

  return pptx;
}

// Main conversion function
async function convertHtmlToPptx(options) {
  const inputData = await getInputContent(options.input);
  let html = inputData.content;

  // For URLs, fetch the content
  if (inputData.type === 'url') {
    if (!puppeteer) {
      puppeteer = require('puppeteer');
    }
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
      await page.goto(inputData.content, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000
      });
      html = await page.content();
    } finally {
      await browser.close();
    }
  }

  // Auto-detect mode
  let mode = options.mode;
  if (mode === 'auto') {
    // Check for complex HTML structures that are better as images
    const $ = cheerio.load(html);
    const hasComplexLayout = $('table, canvas, svg, video, iframe').length > 0;
    const hasAnimations = html.includes('@keyframes') || html.includes('animation');
    const hasManyStyles = (html.match(/<style/g) || []).length > 1;

    mode = (hasComplexLayout || hasAnimations || hasManyStyles) ? 'image' : 'text';
    console.log(`Auto-detected mode: ${mode}`);
  }

  let pptx;
  if (mode === 'image') {
    pptx = await convertImageMode(inputData, options);
  } else {
    pptx = await convertTextMode(html, options);
  }

  // Save the presentation
  await pptx.writeFile({ fileName: options.output });
  console.log(`PowerPoint generated successfully: ${options.output}`);

  return true;
}

// Print help
function printHelp() {
  console.log(`
HTML to PowerPoint Converter with Hebrew/RTL Support
====================================================

Usage:
  html-to-pptx <input> <output.pptx> [options]

Input:
  - Local HTML file path
  - URL (http:// or https://)
  - "-" for stdin (pipe HTML content)

Options:
  --mode=<mode>           Conversion mode (default: auto)
                          - text: Parse HTML and create native PPTX elements
                          - image: Screenshot HTML and embed as images
                          - auto: Detect best mode based on content
  --rtl                   Force RTL direction for Hebrew/Arabic
  --title=<title>         Presentation title
  --author=<author>       Presentation author (default: AVIZ)
  --subject=<subject>     Presentation subject
  --layout=<layout>       Slide layout (default: LAYOUT_16x9)
                          Options: LAYOUT_16x9, LAYOUT_4x3, LAYOUT_WIDE
  --font=<font>           Default font (default: Heebo for Hebrew, Arial otherwise)
  --font-size=<size>      Default font size in points (default: 18)
  --background=<color>    Background color (hex without #, e.g., FFFFFF)
  --slide-per=<selector>  CSS selector to split content into slides
  --wait=<ms>             Wait time for page rendering in image mode (default: 2000)

Examples:
  # Basic conversion (auto mode)
  html-to-pptx presentation.html slides.pptx

  # Hebrew presentation with RTL
  html-to-pptx hebrew.html slides.pptx --rtl

  # Force image mode for complex layouts
  html-to-pptx complex.html slides.pptx --mode=image

  # Convert URL to PowerPoint
  html-to-pptx https://example.com/article slides.pptx

  # Split by sections
  html-to-pptx doc.html slides.pptx --slide-per=section

  # Pipe HTML content
  echo "<h1>שלום עולם</h1><p>תוכן בעברית</p>" | html-to-pptx - output.pptx --rtl

  # Custom styling
  html-to-pptx doc.html slides.pptx --font=David --font-size=24 --background=F5F5F5
`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const options = parseArgs(args);

  if (!options.input || !options.output) {
    console.error('Error: Both input and output are required');
    process.exit(1);
  }

  // Ensure output has .pptx extension
  if (!options.output.endsWith('.pptx')) {
    options.output += '.pptx';
  }

  try {
    await convertHtmlToPptx(options);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
