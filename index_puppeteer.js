const puppeteer = require('puppeteer-core');
const argv = require('minimist')(process.argv.slice(2));
const file = require('mz/fs');
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

function getExtensionPaths(userDataDir) {
  const extensionsPath = path.join(userDataDir, 'Default', 'Extensions');
  const extensions = [];

  if (!fs.existsSync(extensionsPath)) {
    return extensions;
  }

  const extIds = fs.readdirSync(extensionsPath);
  for (const extId of extIds) {
    const extPath = path.join(extensionsPath, extId);
    const stat = fs.statSync(extPath);

    if (!stat.isDirectory() || extId === 'Temp') {
      continue;
    }

    const versions = fs.readdirSync(extPath);
    if (versions.length > 0) {
      const latestVersion = versions.sort().reverse()[0];
      extensions.push(path.join(extPath, latestVersion));
    }
  }

  return extensions;
}

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

    if (err.message && err.message.includes('browser is already running')) {
      console.log('');
      console.log('Chrome is already running with this user data directory.');
      console.log('Please close the existing Chrome window first, then run:');
      console.log('  node index_puppeteer.js');
      console.log('');
      process.exit(1);
    }

    if (err.message && err.message.includes('Target closed')) {
      console.log('The Chrome tab was closed. Trying to reconnect...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const wsUrl = await getWebSocketDebuggerUrl();
        browser = await puppeteer.connect({
          browserWSEndpoint: wsUrl,
          ignoreHTTPSErrors: true
        });
        console.log('Reconnected successfully');
      } catch (reconnectErr) {
        console.log(`Reconnection failed: ${reconnectErr.message}`);
        console.log('Falling back to launching new browser...');
        const userDataDir = path.resolve('D:/WebHistory/userdata');
        const extensionPaths = getExtensionPaths(userDataDir);
        const launchArgs = [
          '--no-sandbox',
          '--no-first-run',
          `--user-data-dir=${userDataDir}`,
          '--remote-debugging-port=9222'
        ];
        if (extensionPaths.length > 0) {
          const extPathsStr = extensionPaths.map(p => path.resolve(p)).join(',');
          launchArgs.push(`--disable-extensions-except=${extPathsStr}`);
          launchArgs.push(`--load-extension=${extPathsStr}`);
          console.log(`Loading ${extensionPaths.length} extensions...`);
        }
        browser = await puppeteer.launch({
          executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          headless: false,
          args: launchArgs
        });
        console.log('Browser launched successfully');
      }
    } else {
      console.log('No existing Chrome found, launching new browser...');
      const userDataDir = path.resolve('D:/WebHistory/userdata');
      const extensionPaths = getExtensionPaths(userDataDir);

      const launchArgs = [
        '--no-sandbox',
        '--no-first-run',
        `--user-data-dir=${userDataDir}`,
        '--remote-debugging-port=9222'
      ];

      if (extensionPaths.length > 0) {
        const extPathsStr = extensionPaths.map(p => path.resolve(p)).join(',');
        launchArgs.push(`--disable-extensions-except=${extPathsStr}`);
        launchArgs.push(`--load-extension=${extPathsStr}`);
        console.log(`Loading ${extensionPaths.length} extensions...`);
      }

      browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: false,
        args: launchArgs
      });
      console.log('Browser launched successfully');
    }
  }

  try {
    fs.readFile(filePath, { encoding: 'utf-8' }, async function (err, data) {
      if (err) {
        console.log(err);
        return;
      }

      let out = {};

      let array = data.split("\n").filter(value => value.length > 0).map(value => value.trim());
      for (let line of array) {
        let name_url = line.split(" ").filter(value => value.length > 0).map(value => value.trim());
        await init(browser, name_url[1], name_url[0]);
        out[name_url[0]] = name_url[1];
      }

      const buffer = new Buffer(JSON.stringify(out, null, 2));
      const jsonPath = `${basefolder}/files.json`;
      await file.writeFile(jsonPath, buffer);

      require('child_process').exec(`start "" "${basefolder}"`);
    });
  } catch (err) {
    if (browser) {
      await browser.disconnect();
    }
    console.error('Failed to read file:', err);
    process.exit(1);
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
    console.error('Exception while taking screenshot:', err);
    process.exit(1);
  }
}
