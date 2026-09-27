const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// We will query a few central points in Merseyside to get a large spread of data
const POINTS = [
  { name: 'Liverpool Center', lat: 53.4084, lng: -2.9916 },
  { name: 'Bootle', lat: 53.447, lng: -2.989 },
  { name: 'Birkenhead', lat: 53.393, lng: -3.014 },
  { name: 'Huyton', lat: 53.410, lng: -2.842 },
  { name: 'St Helens', lat: 53.454, lng: -2.730 }
];

// Map police categories to our internal simplified types
const CATEGORY_MAP = {
  'anti-social-behaviour': 'ASB/Damage',
  'criminal-damage-arson': 'ASB/Damage',
  'burglary': 'Burglary',
  'robbery': 'Robbery',
  'vehicle-crime': 'Theft',
  'theft-from-the-person': 'Theft',
  'bicycle-theft': 'Theft',
  'violent-crime': 'Violent Crime',
  'public-order': 'Violent Crime'
};

async function importPoliceData() {
  console.log("Clearing existing news to make way for Police API data...");
  await supabase.from('crime_news').delete().neq('id', 0);

  let totalImported = 0;

  for (const point of POINTS) {
    console.log(`Fetching Police API data for ${point.name}...`);
    try {
      const res = await fetch(`https://data.police.uk/api/crimes-street/all-crime?lat=${point.lat}&lng=${point.lng}`);
      if (!res.ok) {
        console.log(`Failed for ${point.name}: ${res.statusText}`);
        continue;
      }
      const crimes = await res.json();
      console.log(`Found ${crimes.length} crimes for ${point.name}`);

      const rowsToInsert = [];

      for (const crime of crimes) {
        // Only map specific high-impact residential crimes
        const mappedType = CATEGORY_MAP[crime.category];
        if (!mappedType) continue;

        // Ensure it has a location
        if (!crime.location || !crime.location.latitude) continue;

        rowsToInsert.push({
          title: `Police Report: ${crime.category.replace(/-/g, ' ')}`,
          url: `https://data.police.uk/api/crimes-street/all-crime?lat=${point.lat}&lng=${point.lng}#${crime.id}`,
          published_at: new Date(crime.month + '-01').toISOString(),
          extracted_location: crime.location.street ? crime.location.street.name : point.name,
          lat: parseFloat(crime.location.latitude),
          lng: parseFloat(crime.location.longitude),
          crime_type: mappedType
        });
      }

      // Supabase has a limit on payload size, insert in chunks of 500
      const CHUNK_SIZE = 500;
      for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
        const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('crime_news').insert(chunk);
        if (error) {
          console.error("Insert error:", error);
        } else {
          totalImported += chunk.length;
        }
      }
      console.log(`Imported ${rowsToInsert.length} mapped crimes for ${point.name}`);
    } catch (e) {
      console.error(e);
    }
  }

  console.log(`\nDONE! Successfully imported ${totalImported} data points.`);
}

importPoliceData();
