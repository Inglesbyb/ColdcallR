import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const parser = new Parser();

// Common Merseyside areas for basic NLP extraction
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

// Helper to delay for Nominatim rate limits (1 req/sec)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeArea(areaName: string): Promise<{ lat: number, lng: number } | null> {
  try {
    const query = encodeURIComponent(`${areaName}, Merseyside, UK`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`, {
      headers: {
        'User-Agent': 'ColdcallR-App/1.0'
      }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error("Geocoding failed for", areaName, error);
  }
  return null;
}

export async function GET(request: Request) {
  // Optional cron security
  const authHeader = request.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log("Starting news scrape...");
    
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

    let allItems: any[] = [];

    for (const url of sources) {
      try {
        console.log(`Fetching from: ${url}`);
        const feed = await parser.parseURL(url);
        allItems = allItems.concat(feed.items);
      } catch (e: any) {
        console.error(`Failed to fetch RSS from ${url}:`, e.message);
      }
    }
    
    // Remove duplicate URLs
    const uniqueItems: any[] = [];
    const seenUrls = new Set<string>();
    for (const item of allItems) {
      if (!seenUrls.has(item.link)) {
        seenUrls.add(item.link);
        uniqueItems.push(item);
      }
    }

    console.log(`Found ${uniqueItems.length} unique news items across all sources.`);

    const newArticles = [];

    // Process unique items to get a denser heatmap, rate limit applies per loop
    for (const item of uniqueItems.slice(0, 150)) {
      // Check if already in DB to avoid geocoding again
      const { data: existing } = await supabase
        .from('crime_news')
        .select('id')
        .eq('url', item.link)
        .single();
        
      if (existing) continue; // Already processed

      const title = item.title || "";
      const content = item.contentSnippet || "";
      const textToSearch = `${title} ${content}`.toLowerCase();

      // Simple extraction: Find which area is mentioned
      let extractedArea = null;
      for (const area of LIVERPOOL_AREAS) {
        // use word boundary to avoid partial matches
        const regex = new RegExp(`\\b${area.toLowerCase()}\\b`, 'i');
        if (regex.test(textToSearch)) {
          extractedArea = area;
          break;
        }
      }

      let lat = null;
      let lng = null;

      if (extractedArea) {
        const coords = await geocodeArea(extractedArea);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
        await sleep(1100); // Respect Nominatim 1req/sec limit
      } else {
        // Distribute over a much wider area (Merseyside region) for the demo
        // Liverpool center approx: 53.4084, -2.9916. Spread by 0.25 deg (~25km)
        lat = 53.4084 + (Math.random() - 0.5) * 0.25;
        lng = -2.9916 + (Math.random() - 0.5) * 0.35;
      }

      // Determine basic crime type
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
        extracted_location: extractedArea,
        lat,
        lng,
        crime_type: crimeType
      };

      const { error } = await supabase.from('crime_news').insert(articleData);
      
      if (error) {
        console.error("Insert error:", error);
      } else {
        newArticles.push(articleData);
      }
    }

    return NextResponse.json({
      success: true,
      processed: newArticles.length,
      articles: newArticles
    });

  } catch (error) {
    console.error("Scraper failed:", error);
    return NextResponse.json({ error: "Scraper failed" }, { status: 500 });
  }
}
