const cheerio = require('cheerio');

async function testScrape() {
  const res = await fetch("https://www.merseyside.police.uk/news/merseyside/news/", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log(html.substring(0, 1000));
}

testScrape();
