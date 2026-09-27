const Parser = require('rss-parser');
const parser = new Parser();

async function testGoogleRss() {
  try {
    const query = "\"merseyside police\" liverpool (burglary OR robbery OR stabbing OR shooting OR theft OR \"anti-social behaviour\")";
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;
    console.log("Fetching", feedUrl);
    const feed = await parser.parseURL(feedUrl);
    console.log(`Found ${feed.items.length} items`);
    console.log(feed.items.slice(0, 3).map(i => i.title));
  } catch (e) {
    console.error("Error:", e);
  }
}

testGoogleRss();
