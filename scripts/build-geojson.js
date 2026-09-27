require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ColdCallr-Script' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 404) return resolve(null);
        try { resolve(JSON.parse(data)); } 
        catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function buildGeojson() {
  console.log("Fetching distinct outcodes from leads...");
  
  const { data: leadsData, error } = await supabase
    .from('leads')
    .select('postcode')
    .not('postcode', 'is', null);

  if (error) {
    console.error("Error:", error);
    return;
  }

  const outcodeSet = new Set();
  leadsData.forEach(lead => {
    if (lead.postcode) {
      const parts = lead.postcode.trim().split(/\s+/);
      if (parts.length > 0) {
        let oc = parts[0].toUpperCase();
        if (parts.length === 1 && oc.length >= 5) {
           const match = oc.match(/^([A-Z]{1,2}\d{1,2}[A-Z]?)\d[A-Z]{2}$/i);
           if (match) oc = match[1];
        }
        outcodeSet.add(oc);
      }
    }
  });

  const allOutcodes = Array.from(outcodeSet);
  console.log(`Found ${allOutcodes.length} outcodes.`);

  // Extract the area prefixes (e.g. L from L1, B from B16, AB from AB12)
  const areas = new Set();
  allOutcodes.forEach(oc => {
    const match = oc.match(/^([A-Z]{1,2})/i);
    if (match) areas.add(match[1]);
  });

  const areaList = Array.from(areas);
  console.log(`Need to download ${areaList.length} area GeoJSONs:`, areaList.join(", "));

  const combinedFeatures = [];

  for (const area of areaList) {
    console.log(`Downloading ${area}.geojson...`);
    const url = `https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson/${area}.geojson`;
    const geo = await fetchJson(url);
    if (geo && geo.features) {
      combinedFeatures.push(...geo.features);
    } else {
      console.log(`Failed or not found: ${area}`);
    }
  }

  const finalGeoJSON = {
    type: "FeatureCollection",
    features: combinedFeatures
  };

  fs.writeFileSync('public/national-outcodes.geojson', JSON.stringify(finalGeoJSON));
  console.log(`Saved public/national-outcodes.geojson with ${combinedFeatures.length} total polygons!`);
}

buildGeojson();
