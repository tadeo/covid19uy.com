const puppeteer = require('puppeteer');
const sharp = require('sharp');
const fs = require('fs');
const { promisify } = require('util');
const deleteFile = promisify(fs.unlink);

const URL = 'http://localhost:1313';
const tmpFile = 'screenshot.png'

async function takeScreenshot(page, w, h, path) {
    await page.setViewport({
        width: w,
        height: h,
        isLandscape: true,
        deviceScaleFactor: 1,
    });
    await page.goto(URL);
    await page.evaluateHandle('document.fonts.ready');
    await page.screenshot({ path: path, clip: { x: 0, y: 52, width: w, height: h } });
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function resize(path, w, h, output) {
    let s = sharp(path).resize(w, h)
    if (output.endsWith(".jpg") || output.endsWith(".jpeg")) {
        s = s.jpeg({ mozjpeg: true, quality: 90, chromaSubsampling: '4:4:4' });
    }
    await s.toFile(output);
}

async function takeScreenshots(outputDir) {
    const browser = await puppeteer.launch({
        args: ['--lang=es-UY', '--no-sandbox', '--disable-web-security', '--disable-gpu', '--hide-scrollbars', '--disable-setuid-sandbox'],
        headless: true
    });
    const page = await browser.newPage();
    await takeScreenshot(page, 1216, 630, tmpFile);
    await resize(tmpFile, 1200, 630, outputDir + '/images/seo/opengraph.jpg');
    // workaround for net::ERR_ABORTED thown sometimes
    await wait(500);
    await takeScreenshot(page, 2048, 1024, tmpFile);
    await resize(tmpFile, 1024, 512, outputDir + '/images/seo/twitter_card.jpg'),
        await browser.close();
    await deleteFile(tmpFile);
}
(async () => {
    takeScreenshots('./static');
})();