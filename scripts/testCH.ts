import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const CH_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

function getAuthHeader() {
  const encoded = Buffer.from(`${CH_API_KEY}:`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

async function testQuery(postcode: string) {
  const params = new URLSearchParams({
    company_status: "active",
    location: postcode,
    size: "1",
  });

  console.log(`Testing location=${postcode}`);
  const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params}`, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" }
  });
  const data = await res.json();
  const items = data.items || [];
  if (items.length > 0) {
    console.log(`First item postcode: ${items[0].registered_office_address?.postal_code}, company: ${items[0].company_name}`);
  } else {
    console.log("No items found.");
  }
}

async function testQueryPostalCode(postcode: string) {
  const params = new URLSearchParams({
    company_status: "active",
    postal_code: postcode,
    size: "1",
  });

  console.log(`Testing postal_code=${postcode}`);
  const res = await fetch(`https://api.company-information.service.gov.uk/advanced-search/companies?${params}`, {
    headers: { ...getAuthHeader(), "Content-Type": "application/json" }
  });
  const data = await res.json();
  const items = data.items || [];
  if (items.length > 0) {
    console.log(`First item postcode: ${items[0].registered_office_address?.postal_code}, company: ${items[0].company_name}`);
  } else {
    console.log("No items found.");
  }
}

async function run() {
  await testQueryPostalCode("L1*");
  await testQueryPostalCode("L38*");
  await testQuery("L1");
  await testQuery("L38");
}

run();
