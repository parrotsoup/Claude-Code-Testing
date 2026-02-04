const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pdfParse = require('pdf-parse');

// Configuration
const CONFIG = {
  // JP Morgan investor relations page with annual reports
  targetUrl: 'https://www.jpmorganchase.com/ir/annual-report',
  downloadDir: path.join(__dirname, 'downloads'),
  maxPdfs: 10, // Limit number of PDFs to download
  timeout: 60000, // 60 second timeout for page loads
};

/**
 * Find Chrome executable path on the system
 */
function findChrome() {
  const possiblePaths = [
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const chromePath of possiblePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  // Try using 'which' command on Unix systems
  try {
    const result = execSync('which google-chrome || which chromium || which chromium-browser', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (result) return result;
  } catch (e) {
    // Ignore errors
  }

  return null;
}

/**
 * Sanitize a filename by removing invalid characters
 */
function sanitizeFilename(name) {
  // Remove or replace invalid filename characters
  let sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Limit length (keep room for .pdf extension)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Fallback if empty
  if (!sanitized) {
    sanitized = 'unnamed-document';
  }

  return sanitized;
}

/**
 * Extract the first meaningful line from a PDF
 */
async function getFirstLineFromPdf(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    // Split text into lines and find first non-empty line
    const lines = data.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and very short lines (likely page numbers, etc.)
      if (trimmed && trimmed.length > 3) {
        return trimmed;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error parsing PDF ${pdfPath}:`, error.message);
    return null;
  }
}

/**
 * Wait for a file to be fully downloaded
 */
async function waitForDownload(downloadPath, timeoutMs = 30000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Check if any .crdownload files exist (Chrome's partial download extension)
    const files = fs.readdirSync(downloadPath);
    const downloading = files.some(f => f.endsWith('.crdownload'));

    if (!downloading && files.length > 0) {
      // Give a small buffer for file system sync
      await new Promise(r => setTimeout(r, 500));
      return true;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  return false;
}

/**
 * Get all PDF files in a directory
 */
function getPdfFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .map(f => path.join(directory, f));
}

/**
 * Main function to download and rename PDFs
 */
async function downloadAndRenamePdfs() {
  console.log('JP Morgan PDF Downloader & Renamer');
  console.log('==================================\n');

  // Create download directory
  if (!fs.existsSync(CONFIG.downloadDir)) {
    fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
    console.log(`Created download directory: ${CONFIG.downloadDir}\n`);
  }

  // Track existing PDFs to identify new downloads
  const existingPdfs = new Set(getPdfFiles(CONFIG.downloadDir));

  console.log('Looking for Chrome installation...');

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('ERROR: Could not find Chrome/Chromium installation.');
    console.error('Please install Google Chrome or Chromium browser.');
    console.error('\nAlternatively, set CHROME_PATH environment variable:');
    console.error('  export CHROME_PATH=/path/to/chrome');
    process.exit(1);
  }

  console.log(`Found Chrome at: ${chromePath}`);
  console.log('Launching Chrome browser...');

  // Launch browser with download preferences
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || chromePath,
    headless: false, // Set to true for headless mode
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox'],
  });

  const page = await browser.newPage();

  // Configure download behavior
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: CONFIG.downloadDir,
  });

  console.log(`Navigating to: ${CONFIG.targetUrl}\n`);

  try {
    await page.goto(CONFIG.targetUrl, {
      waitUntil: 'networkidle2',
      timeout: CONFIG.timeout
    });

    // Wait for page to fully load
    await new Promise(r => setTimeout(r, 2000));

    // Find all PDF links on the page
    const pdfLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links
        .filter(link => {
          const href = link.href.toLowerCase();
          return href.endsWith('.pdf') || href.includes('.pdf');
        })
        .map(link => ({
          url: link.href,
          text: link.textContent.trim()
        }));
    });

    console.log(`Found ${pdfLinks.length} PDF links on the page.\n`);

    if (pdfLinks.length === 0) {
      console.log('No PDF links found. The page structure may have changed.');
      console.log('You can manually navigate the browser to find PDFs.');
      console.log('Press Ctrl+C to exit when done.\n');

      // Keep browser open for manual interaction
      await new Promise(r => setTimeout(r, 300000)); // 5 minutes
    }

    // Download PDFs (limit to maxPdfs)
    const linksToDownload = pdfLinks.slice(0, CONFIG.maxPdfs);
    console.log(`Downloading ${linksToDownload.length} PDFs...\n`);

    for (let i = 0; i < linksToDownload.length; i++) {
      const link = linksToDownload[i];
      console.log(`[${i + 1}/${linksToDownload.length}] Downloading: ${link.text || link.url}`);

      try {
        // Click the link to download
        await page.evaluate((url) => {
          const link = document.querySelector(`a[href="${url}"]`);
          if (link) link.click();
        }, link.url);

        // Wait for download to complete
        await waitForDownload(CONFIG.downloadDir);
        console.log('  Download complete.');

        // Small delay between downloads
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        console.log(`  Error downloading: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error during page navigation:', error.message);
  }

  await browser.close();
  console.log('\nBrowser closed. Processing downloaded PDFs...\n');

  // Process and rename all new PDFs
  const allPdfs = getPdfFiles(CONFIG.downloadDir);
  const newPdfs = allPdfs.filter(p => !existingPdfs.has(p));

  console.log(`Processing ${newPdfs.length} new PDF files...\n`);

  const results = [];

  for (const pdfPath of newPdfs) {
    const originalName = path.basename(pdfPath);
    console.log(`Processing: ${originalName}`);

    const firstLine = await getFirstLineFromPdf(pdfPath);

    if (firstLine) {
      const newName = sanitizeFilename(firstLine) + '.pdf';
      const newPath = path.join(CONFIG.downloadDir, newName);

      // Handle duplicate names
      let finalPath = newPath;
      let counter = 1;
      while (fs.existsSync(finalPath) && finalPath !== pdfPath) {
        const baseName = sanitizeFilename(firstLine);
        finalPath = path.join(CONFIG.downloadDir, `${baseName} (${counter}).pdf`);
        counter++;
      }

      if (finalPath !== pdfPath) {
        fs.renameSync(pdfPath, finalPath);
        console.log(`  Renamed to: ${path.basename(finalPath)}`);
        results.push({ original: originalName, renamed: path.basename(finalPath), firstLine });
      } else {
        console.log('  Already named correctly.');
        results.push({ original: originalName, renamed: originalName, firstLine });
      }
    } else {
      console.log('  Could not extract first line. Keeping original name.');
      results.push({ original: originalName, renamed: originalName, firstLine: null });
    }

    console.log('');
  }

  // Summary
  console.log('\n==================================');
  console.log('SUMMARY');
  console.log('==================================');
  console.log(`Total PDFs processed: ${results.length}`);
  console.log(`Successfully renamed: ${results.filter(r => r.original !== r.renamed).length}`);
  console.log(`Download directory: ${CONFIG.downloadDir}`);
  console.log('\nResults:');

  for (const result of results) {
    console.log(`\n  Original: ${result.original}`);
    if (result.firstLine) {
      console.log(`  First line: "${result.firstLine.substring(0, 80)}${result.firstLine.length > 80 ? '...' : ''}"`);
    }
    console.log(`  New name: ${result.renamed}`);
  }
}

// Run the script
downloadAndRenamePdfs()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
