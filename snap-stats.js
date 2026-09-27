const puppeteer = require('puppeteer');

async function snap() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000/residential', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click the stats tab
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const statsBtn = btns.find(b => b.textContent && b.textContent.includes('Crime Stats'));
    if (statsBtn) statsBtn.click();
  });

  await new Promise(r => setTimeout(r, 1000));

  // Type postcode and search
  try {
    await page.type('input[placeholder="Enter Postcode (e.g. L1 8JQ)"]', 'L1 8JQ');
    await page.click('button[type="submit"]');
  } catch (e) {
    console.log("Could not find input:", e.message);
  }

  // Wait for fetch to complete
  await new Promise(r => setTimeout(r, 4000));
  
  await page.screenshot({ path: 'C:/Users/Eggwi/.gemini/antigravity-ide/brain/7e7f2ffd-aec9-4fd2-9b03-0da7c60a8973/stats_layer_screenshot.png' });
  console.log('Saved screenshot of Stats Layer.');
  await browser.close();
}

snap();
