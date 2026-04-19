const puppeteer = require('puppeteer-core');
const argv = require('minimist')(process.argv.slice(2));
const delay = require('delay');
const http = require('http');

const viewportWidth = argv.viewportWidth || 1920;
let viewportHeight = argv.viewportHeight || 1080;
const pageDelay = argv.delay || 0;
const userAgent = argv.userAgent;
const fullPage = argv.full;

let fs = require('fs'),
  path = require('path'),
  filePath = path.join(__dirname, 'list.txt');
let dateFormat = require('dateformat');

function ensureDirSync(dirpath) {
  try {
    fs.mkdirSync(dirpath, { recursive: true })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

let datestring = dateFormat(new Date(), "yyyymmdd");
let basefolder = `history\\${datestring}`;
ensureDirSync("history");
ensureDirSync(basefolder);

async function start() {
  let browser;

  async function getWebSocketDebuggerUrl(retries = 5, delayMs = 1000) {
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Checking for Chrome (${i + 1}/${retries})...`);
        const response = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9222/json/version', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(new Error('Invalid JSON response'));
              }
            });
          }).on('error', reject);
        });

        if (response && response.webSocketDebuggerUrl) {
          return response.webSocketDebuggerUrl;
        }

        throw new Error('No WebSocket URL found in response');
      } catch (err) {
        console.log(`Connection check failed: ${err.message}`);
        if (i < retries - 1) {
          console.log(`Retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          throw err;
        }
      }
    }
  }

  try {
    console.log('Looking for existing Chrome...');
    const wsUrl = await getWebSocketDebuggerUrl();
    console.log(`Found Chrome, connecting to ${wsUrl}...`);
    browser = await puppeteer.connect({
      browserWSEndpoint: wsUrl,
      ignoreHTTPSErrors: true
    });
    console.log('Connected to existing Chrome successfully');
  } catch (err) {
    console.log(`Connection failed: ${err.message}`);
    console.log('');
    console.log('A Chrome instance with remote debugging must already be running.');
    console.log('You can start it with: capture_puppeteer.bat');
    console.log('Expected endpoint: http://127.0.0.1:9222/json/version');
    console.log('');
    process.exit(1);
  }

  try {
    const data = await fs.promises.readFile(filePath, { encoding: 'utf-8' });
    const out = {};
    const array = data.split("\n").filter(value => value.length > 0).map(value => value.trim());

    for (const line of array) {
      const name_url = line.split(" ").filter(value => value.length > 0).map(value => value.trim());
      if (name_url.length < 2) {
        console.warn(`Skipping invalid line in list.txt: ${line}`);
        continue;
      }

      await init(browser, name_url[1], name_url[0]);
      out[name_url[0]] = name_url[1];
    }

    const buffer = Buffer.from(JSON.stringify(out, null, 2));
    const jsonPath = `${basefolder}/files.json`;
    await fs.promises.writeFile(jsonPath, buffer);

    require('child_process').exec(`start "" "${basefolder}"`);
  } catch (err) {
    console.error('Failed to process list.txt or capture screenshots:', err);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.disconnect();
    }
  }
}

start();

async function init(browser, url, output) {
  try {
    const page = await browser.newPage();

    if (userAgent) {
      await page.setUserAgent(userAgent);
    }

    await page.setViewport({
      width: parseInt(viewportWidth),
      height: parseInt(viewportHeight),
      deviceScaleFactor: 1,
      isMobile: false,
    });

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'load' });

    if (pageDelay > 0) {
      await delay(pageDelay * 1000);
    } else {
      await delay(5000);
    }

    if (fullPage) {
      const bodyHandle = await page.$('body');
      const boundingBox = await bodyHandle.boundingBox();
      viewportHeight = boundingBox.height;
      await page.setViewport({
        width: parseInt(viewportWidth),
        height: Math.ceil(viewportHeight),
        deviceScaleFactor: 1,
        isMobile: false,
      });
    }

    const screenshotPath = `${basefolder}/${output}_${datestring}.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: !!fullPage,
      type: 'png'
    });

    console.log('Screenshot saved');
    await page.close();
  } catch (err) {
    throw err;
  }
}
