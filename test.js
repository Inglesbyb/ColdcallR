const { createClient } = require('@supabase/supabase-js');
const RSS = require('rss-parser');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const parser = new RSS();

const LIVERPOOL_AREAS = [
  "Aigburth", "Allerton", "Anfield", "Belle Vale", "Broadgreen", "Childwall", 
  "Clubmoor", "Croxteth", "Dingle", "Edge Hill", "Everton", "Fazakerley", 
  "Garston", "Gateacre", "Hunts Cross", "Kensington", "Kirkdale", "Knotty Ash", 
  "Mossley Hill", "Netherley", "Norris Green", "Old Swan", "Picton", "Riverside", 
  "Speke", "St Michaels", "Stoneycroft", "Toxteth", "Tuebrook", "Vauxhall", 
  "Walton", "Wavertree", "West Derby", "Woolton", "City Centre", "Bootle", 
  "Crosby", "Huyton", "Kirkby", "Prescot", "Southport", "Birkenhead", 
  "Wallasey", "Bebington", "Heswall", "Hoylake", "West Kirby", "Wirral", "Sefton", "Knowsley", "St Helens"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeArea(areaName) {
  try {
    const query = encodeURIComponent(`${areaName}, Merseyside, UK`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`, {
      headers: { 'User-Agent': 'ColdcallR-App/1.0' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (error) {
    console.error("Geocoding failed for", areaName, error);
  }
  return null;
}

async function scrape() {
  console.log("Clearing all existing news...");
  const { error } = await supabase.from('crime_news').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error("Failed to clear DB:", error);
    return;
  }

  // 1. Google News (Merseyside Police - Last 30 Days)
  const query = "\"merseyside police\" (burglary OR robbery OR stabbing OR shooting OR theft OR \"anti-social behaviour\") when:30d";
  const googleFeedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;

  // 2. Direct Local News Feeds
  const sources = [
    googleFeedUrl,
    'https://www.sthelensstar.co.uk/news/crime/rss/',
    'https://www.wirralglobe.co.uk/news/crime/rss/',
    'https://www.runcornandwidnesworld.co.uk/news/crime/rss/',
    'https://www.birkenhead.news/feed/',
    'https://www.liverpoolecho.co.uk/news/liverpool-news/?service=rss'
  ];

  let allItems = [];

  for (const url of sources) {
    try {
      console.log(`Fetching from: ${url}`);
      const feed = await parser.parseURL(url);
      allItems = allItems.concat(feed.items);
    } catch (e) {
      console.error(`Failed to fetch RSS from ${url}:`, e.message);
    }
  }
  
  // Remove duplicate URLs
  const uniqueItems = [];
  const seenUrls = new Set();
  for (const item of allItems) {
    if (!seenUrls.has(item.link)) {
      seenUrls.add(item.link);
      uniqueItems.push(item);
    }
  }

  console.log(`Found ${uniqueItems.length} unique news items across all sources.`);

  // Limit processing to 150 items to avoid timeouts and API limits
  for (const item of uniqueItems.slice(0, 150)) {
    const { data: existing } = await supabase
      .from('crime_news')
      .select('id')
      .eq('url', item.link)
      .single();
      
    if (existing) continue;

    const title = item.title || "";
    const content = item.contentSnippet || "";
    const textToSearch = `${title} ${content}`.toLowerCase();

    let extractedArea = null;
    for (const area of LIVERPOOL_AREAS) {
      const regex = new RegExp(`\\b${area.toLowerCase()}\\b`, 'i');
      if (regex.test(textToSearch)) {
        extractedArea = area;
        break;
      }
    }

    let lat = null, lng = null;
    if (extractedArea) {
      const coords = await geocodeArea(extractedArea);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
      await sleep(1100);
    } else {
        // Distribute over a much wider area (Merseyside region)
        // Liverpool center: 53.4084, -2.9916. Spread by ~0.25 degrees (approx 25km radius)
        lat = 53.4084 + (Math.random() - 0.5) * 0.25;
        lng = -2.9916 + (Math.random() - 0.5) * 0.35;
    }

    let crimeType = "Other";
    if (/burglary|break-in/i.test(textToSearch)) crimeType = "Burglary";
    else if (/robbery|mugging/i.test(textToSearch)) crimeType = "Robbery";
    else if (/stabbing|shooting|attack|assault|murder/i.test(textToSearch)) crimeType = "Violent Crime";
    else if (/theft|stolen/i.test(textToSearch)) crimeType = "Theft";
    else if (/anti-social|vandalism|arson/i.test(textToSearch)) crimeType = "ASB/Damage";

    const articleData = {
      title: item.title,
      url: item.link,
      published_at: item.isoDate || new Date().toISOString(),
      extracted_location: extractedArea || "Unknown Area",
      lat,
      lng,
      crime_type: crimeType
    };

    const { error: insertError } = await supabase.from('crime_news').insert(articleData);
    if (!insertError) console.log("Added:", item.title);
  }
  
  console.log("Done restoring latest breaking news!");
}

scrape();
