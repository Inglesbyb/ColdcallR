const cheerio = require('cheerio');

async function test() {
  const res = await fetch('https://www.merseyside.police.uk/news/merseyside/news/', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const news = [];
  $('.news-article').each((i, el) => {
    const title = $(el).find('h3').text().trim();
    const link = $(el).find('a').attr('href');
    const date = $(el).find('time').attr('datetime');
    if (title) news.push({ title, link, date });
  });
  
  if (news.length === 0) {
      // Maybe different classes, let's just log the HTML of the main body or all h2/h3 tags with links
      console.log("Found no .news-article. Let's look for standard links:");
      $('a').each((i, el) => {
          const t = $(el).text().trim();
          const href = $(el).attr('href');
          if (href && href.includes('/news/merseyside/news/') && t.length > 15) {
              news.push({ title: t, link: href });
          }
      });
  }

  console.log(news.slice(0, 5));
}

test();
