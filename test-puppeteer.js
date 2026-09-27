const puppeteer = require('puppeteer');

async function testSocial() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  // Test Twitter
  console.log("Testing X (Twitter)...");
  try {
    await page.goto('https://twitter.com/MerseyPolice', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000)); // Wait for potential redirects
    await page.screenshot({ path: 'C:/Users/Eggwi/.gemini/antigravity-ide/brain/7e7f2ffd-aec9-4fd2-9b03-0da7c60a8973/twitter_scrape.png' });
    console.log("Twitter screenshot saved.");
  } catch (e) {
    console.log('Twitter timeout or error:', e.message);
  }

  // Test Facebook
  console.log("\nTesting Facebook...");
  try {
    await page.goto('https://www.facebook.com/merseypolice/', { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 3000)); // Wait for potential login modals
    await page.screenshot({ path: 'C:/Users/Eggwi/.gemini/antigravity-ide/brain/7e7f2ffd-aec9-4fd2-9b03-0da7c60a8973/facebook_scrape.png' });
    console.log("Facebook screenshot saved.");
  } catch (e) {
    console.log('Facebook timeout or error:', e.message);
  }

  await browser.close();
}

testSocial();
