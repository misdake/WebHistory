const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));
const file = require('mz/fs');
const timeout = require('delay');

// CLI Args
const viewportWidth = argv.viewportWidth || 1920;
let viewportHeight = argv.viewportHeight || 1080;
const delay = argv.delay || 0;
const userAgent = argv.userAgent;
const fullPage = argv.full;

let fs = require('fs'),
    path = require('path'),
    filePath = path.join(__dirname, 'list.txt');
let dateFormat = require('dateformat');

function ensureDirSync(dirpath) {
  try {
    fs.mkdirSync(dirpath, {recursive: true})
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}
let datestring = dateFormat(new Date(), "yyyymmdd");
let basefolder = `history\\${datestring}`;
ensureDirSync(basefolder);

async function start() {
  fs.readFile(filePath, {encoding: 'utf-8'}, async function (err, data) {
    if (err) {
      console.log(err);
      return;
    }

    let out = {};

    let array = data.split("\n").filter(value => value.length > 0).map(value => value.trim());
    for (let line of array) {
      let name_url = line.split(" ").filter(value => value.length > 0).map(value => value.trim());
      await init(name_url[1], name_url[0]);
      out[name_url[0]] = name_url[1];
    }

    const buffer = new Buffer(JSON.stringify(out, null, 2));
    const path = `${basefolder}/files.json`;
    await file.writeFile(path, buffer);

    require('child_process').exec(`start "" "${basefolder}"`);
  });
}

start();

async function init(url, output) {
  let client;
  try {
    // Start the Chrome Debugging Protocol
    client = await CDP({remote: true, host: "localhost", port: 9222});

    // Verify version
    const { Browser } = await CDP.Version();
    const browserVersion = Browser.match(/\/(\d+)/)[1];
    if (Number(browserVersion) !== 60) {
      console.warn(`This script requires Chrome 60, however you are using version ${browserVersion}. The script is not guaranteed to work and you may need to modify it.`);
    }

    // Extract used DevTools domains.
    const {DOM, Emulation, Network, Page, Runtime} = client;

    // Enable events on domains we are interested in.
    await Page.enable();
    await DOM.enable();
    await Network.enable();

    // If user agent override was specified, pass to Network domain
    if (userAgent) {
      await Network.setUserAgentOverride({userAgent});
    }

    // Set up viewport resolution, etc.
    const deviceMetrics = {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 0,
      mobile: false,
      fitWindow: false,
    };
    await Emulation.setDeviceMetricsOverride(deviceMetrics);
    await Emulation.setVisibleSize({
      width: viewportWidth,
      height: viewportHeight,
    });

    // Navigate to target page
    await Page.navigate({url});

    // Wait for page load event to take screenshot
    await Page.loadEventFired();

    await timeout(delay);

    // If the `full` CLI option was passed, we need to measure the height of
    // the rendered page and use Emulation.setVisibleSize
    if (fullPage) {
      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
      const {model} = await DOM.getBoxModel({nodeId: bodyNodeId});
      viewportHeight = model.height;

      await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
      // This forceViewport call ensures that content outside the viewport is
      // rendered, otherwise it shows up as grey. Possibly a bug?
      await Emulation.forceViewport({x: 0, y: 0, scale: 1});
    }

    const screenshot = await Page.captureScreenshot({
      format: 'png',
      fromSurface: true,
      clip: {
        width: viewportWidth,
        height: viewportHeight,
        x: 0, y: 0, scale: 1
      }
    });

    const buffer = new Buffer(screenshot.data, 'base64');
    const path = `${basefolder}/${output}_${datestring}.png`;
    await file.writeFile(path, buffer, 'base64');
    console.log('Screenshot saved');
    client.close();
  } catch (err) {
    if (client) {
      client.close();
    }
    console.error('Exception while taking screenshot:', err);
    process.exit(1);
  }
}
