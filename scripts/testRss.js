const Parser = require('rss-parser');
const parser = new Parser();

async function testRss() {
  try {
    const feed = await parser.parseURL('https://www.liverpoolecho.co.uk/news/liverpool-news/crime/?service=rss');
    console.log(feed.items.slice(0, 5).map(i => i.title));
  } catch (e) {
    console.error(e);
  }
}

testRss();
