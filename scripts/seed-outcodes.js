require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const querystring = require('querystring');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper to make https GET request
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ColdCallr-Script' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } 
        catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

// Fetch avg house price
function fetchHousePrice(outcode) {
  return new Promise((resolve) => {
    const query = `
    PREFIX  ppd:  <http://landregistry.data.gov.uk/def/ppi/>
    PREFIX  lrcommon: <http://landregistry.data.gov.uk/def/common/>
    SELECT ?amount
    WHERE
    {
      ?transx ppd:pricePaid ?amount ;
              ppd:transactionDate ?date ;
              ppd:propertyAddress ?addr .
      ?addr lrcommon:postcode ?postcode .
      FILTER(regex(?postcode, "^${outcode} "))
    }
    ORDER BY DESC(?date)
    LIMIT 50
    `;

    const postData = querystring.stringify({ query });
    const options = {
      hostname: 'landregistry.data.gov.uk',
      path: '/landregistry/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/sparql-results+json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const prices = parsed.results.bindings.map(b => parseInt(b.amount.value, 10));
          if (prices.length === 0) return resolve(0);
          const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          resolve(avg);
        } catch (e) {
          resolve(0);
        }
      });
    });
    req.on('error', () => resolve(0));
    req.write(postData);
    req.end();
  });
}

async function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function seed() {
  console.log("Starting Outcode Seeding based on Commercial Liverpool outcodes...");

  const liverpoolData = JSON.parse(fs.readFileSync('./public/liverpool-outcodes.geojson'));
  const outcodes = liverpoolData.features.map(f => f.properties.name).sort();

  console.log(`Found ${outcodes.length} distinct outcodes in geojson:`, outcodes.join(", "));

  for (const outcode of outcodes) {
    console.log(`\nProcessing ${outcode}...`);

    try {
      // 1. Get Lat/Lng for Outcode
      const pcRes = await fetchJson(`https://api.postcodes.io/outcodes/${outcode}`);
      if (!pcRes || !pcRes.result) {
        console.log(`Skipping ${outcode} - no postcode data found.`);
        continue;
      }
      const lat = pcRes.result.latitude;
      const lng = pcRes.result.longitude;

      // 2. Get Crime Count
      let crimeCount = 0;
      let crimeBreakdown = {};
      const crimeRes = await fetchJson(`https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}`);
      if (Array.isArray(crimeRes) && crimeRes.length > 0) {
        crimeCount = crimeRes.length;
        crimeRes.forEach(crime => {
          const cat = crime.category || 'other-crime';
          if (!crimeBreakdown[cat]) crimeBreakdown[cat] = 0;
          crimeBreakdown[cat]++;
        });
      }

      // 3. Get Avg House Price
      const avgPrice = await fetchHousePrice(outcode);

      console.log(`${outcode}: Price = £${avgPrice.toLocaleString()}, Crime = ${crimeCount}`);

      // 4. Save to Supabase
      const payload = {
        outcode,
        avg_house_price: avgPrice,
        crime_count: crimeCount,
        crime_breakdown: crimeBreakdown,
        last_updated: new Date().toISOString()
      };

      let { error } = await supabase.from('outcode_stats').upsert(payload);
      
      if (error && error.message && error.message.includes('crime_breakdown')) {
         // Fallback if the user hasn't run the SQL yet
         console.warn(`crime_breakdown column missing, falling back for ${outcode}`);
         const fallbackPayload = {
           outcode,
           avg_house_price: avgPrice,
           crime_count: crimeCount,
           last_updated: new Date().toISOString()
         };
         const { error: fallbackError } = await supabase.from('outcode_stats').upsert(fallbackPayload);
         if (fallbackError) console.error(`Fallback error saving ${outcode}:`, fallbackError.message);
      } else if (error) {
        console.error(`Error saving ${outcode}:`, error.message);
      }

      // Police API is rate limited to 15 per second, Postcodes is also rate limited.
      await delay(300);

    } catch (e) {
      console.error(`Error processing ${outcode}:`, e.message);
    }
  }

  console.log("\nSeeding complete!");
}

seed();
