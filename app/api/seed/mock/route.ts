import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { scoreLead, getSicDescription } from "@/lib/scoring";

// POST /api/seed/mock — seeds realistic fake Liverpool leads for demo/testing
// Use this while waiting for your Companies House API key

const MOCK_BUSINESSES = [
  // L1 — City Centre
  { company_number: "MOCK00001", name: "Mathew Street Wines Ltd", status: "active", incorporated: "2019-03-14", sic: ["56302"], postcode: "L1 6BR", address: "26 Mathew Street", lat: 53.4075, lng: -2.9924, burglaries: 12 },
  { company_number: "MOCK00002", name: "Bold Street Coffee Collective", status: "active", incorporated: "2021-07-22", sic: ["56102"], postcode: "L1 4DN", address: "89 Bold Street", lat: 53.4038, lng: -2.9809, burglaries: 8 },
  { company_number: "MOCK00003", name: "Liverpool Jewellery Quarter Ltd", status: "active", incorporated: "2015-11-03", sic: ["47770"], postcode: "L1 1RR", address: "14 Lord Street", lat: 53.4053, lng: -2.9844, burglaries: 15 },
  { company_number: "MOCK00004", name: "Cavern Club Merchandise Ltd", status: "active", incorporated: "2012-04-01", sic: ["47630"], postcode: "L1 6HL", address: "10 Mathew Street", lat: 53.4081, lng: -2.9918, burglaries: 11 },
  { company_number: "MOCK00005", name: "Central Village Retail Ltd", status: "active", incorporated: "2020-01-15", sic: ["47190"], postcode: "L1 4EY", address: "12 Ranelagh Street", lat: 53.4063, lng: -2.9826, burglaries: 9 },

  // L2 — Business District
  { company_number: "MOCK00006", name: "Dale Street Electronics", status: "active", incorporated: "2022-05-10", sic: ["47410"], postcode: "L2 2PP", address: "55 Dale Street", lat: 53.4098, lng: -2.9905, burglaries: 5 },
  { company_number: "MOCK00007", name: "Water Street Solicitors", status: "active", incorporated: "2008-02-28", sic: ["69102"], postcode: "L2 8TD", address: "100 Water Street", lat: 53.4069, lng: -2.9963, burglaries: 3 },

  // L3 — Georgian Quarter / Copperas Hill
  { company_number: "MOCK00008", name: "Copperas Hill Convenience Ltd", status: "active", incorporated: "2018-09-01", sic: ["47110"], postcode: "L3 1HN", address: "22 Copperas Hill", lat: 53.4091, lng: -2.9784, burglaries: 7 },
  { company_number: "MOCK00009", name: "Myrtle Street Beauty Supplies", status: "active", incorporated: "2023-02-14", sic: ["47750"], postcode: "L3 7DR", address: "45 Myrtle Street", lat: 53.4021, lng: -2.9761, burglaries: 6 },
  { company_number: "MOCK00010", name: "Liverpool Medical Centre Ltd", status: "active", incorporated: "2010-06-15", sic: ["86210"], postcode: "L3 5TR", address: "8 Pembroke Place", lat: 53.4048, lng: -2.9743, burglaries: 2 },

  // L4 — Anfield / Everton
  { company_number: "MOCK00011", name: "Anfield Road Motors", status: "active", incorporated: "2016-08-22", sic: ["45112"], postcode: "L4 0TH", address: "112 Anfield Road", lat: 53.4308, lng: -2.9607, burglaries: 14 },
  { company_number: "MOCK00012", name: "Spellow Lane Newsagent Ltd", status: "active", incorporated: "2014-03-10", sic: ["47210"], postcode: "L4 4AJ", address: "88 Spellow Lane", lat: 53.4287, lng: -2.9591, burglaries: 10 },
  { company_number: "MOCK00013", name: "Breck Road Off Licence Ltd", status: "active", incorporated: "2019-11-05", sic: ["47210"], postcode: "L4 2QL", address: "33 Breck Road", lat: 53.4264, lng: -2.9558, burglaries: 9 },

  // L5 — Everton / Vauxhall
  { company_number: "MOCK00014", name: "Scotland Road Food & Drink", status: "active", incorporated: "2020-04-22", sic: ["47110"], postcode: "L5 8SH", address: "201 Scotland Road", lat: 53.4178, lng: -2.9869, burglaries: 16 },
  { company_number: "MOCK00015", name: "Vauxhall Road Tyres Ltd", status: "active", incorporated: "2017-07-08", sic: ["45200"], postcode: "L5 3LF", address: "77 Vauxhall Road", lat: 53.4212, lng: -2.9924, burglaries: 13 },

  // L6 — Fairfield / Kensington
  { company_number: "MOCK00016", name: "Kensington Foodstore Ltd", status: "active", incorporated: "2021-09-30", sic: ["47110"], postcode: "L6 3AA", address: "142 Kensington", lat: 53.4193, lng: -2.9561, burglaries: 11 },
  { company_number: "MOCK00017", name: "Edge Lane Dental Practice", status: "active", incorporated: "2013-04-15", sic: ["86230"], postcode: "L6 9BX", address: "56 Edge Lane", lat: 53.4161, lng: -2.9454, burglaries: 1 },

  // L7 — Edge Hill / Wavertree
  { company_number: "MOCK00018", name: "Crown Street Auto Services", status: "active", incorporated: "2018-12-01", sic: ["45200"], postcode: "L7 3QD", address: "18 Crown Street", lat: 53.4021, lng: -2.9638, burglaries: 8 },
  { company_number: "MOCK00019", name: "Wavertree Technology Park Ltd", status: "active", incorporated: "2024-01-10", sic: ["47410"], postcode: "L7 9PT", address: "110 Edge Lane", lat: 53.4022, lng: -2.9412, burglaries: 3 },

  // L8 — Toxteth
  { company_number: "MOCK00020", name: "Lodge Lane Convenience Ltd", status: "active", incorporated: "2019-06-20", sic: ["47110"], postcode: "L8 0QS", address: "255 Lodge Lane", lat: 53.3935, lng: -2.9612, burglaries: 17 },
  { company_number: "MOCK00021", name: "Smithdown Road Restaurant Ltd", status: "active", incorporated: "2022-03-01", sic: ["56101"], postcode: "L8 3SZ", address: "44 Smithdown Road", lat: 53.3891, lng: -2.9521, burglaries: 9 },
  { company_number: "MOCK00022", name: "Parliament Street Motors", status: "active", incorporated: "2015-10-18", sic: ["45112"], postcode: "L8 5RN", address: "88 Parliament Street", lat: 53.3949, lng: -2.9744, burglaries: 12 },

  // L9 — Walton
  { company_number: "MOCK00023", name: "County Road Superstore Ltd", status: "active", incorporated: "2011-07-04", sic: ["47110"], postcode: "L9 1LP", address: "360 County Road", lat: 53.4523, lng: -2.9611, burglaries: 8 },
  { company_number: "MOCK00024", name: "Walton Vale Pharmacy", status: "active", incorporated: "2020-08-12", sic: ["47730"], postcode: "L9 2BU", address: "99 Walton Vale", lat: 53.4497, lng: -2.9568, burglaries: 2 },

  // L11 — Norris Green
  { company_number: "MOCK00025", name: "Utting Avenue Grocers", status: "active", incorporated: "2023-06-01", sic: ["47110"], postcode: "L11 1DH", address: "12 Utting Avenue", lat: 53.4425, lng: -2.9378, burglaries: 10 },

  // L13 — Old Swan
  { company_number: "MOCK00026", name: "Old Swan Off Licence Ltd", status: "active", incorporated: "2017-02-14", sic: ["47210"], postcode: "L13 2AW", address: "200 Prescot Road", lat: 53.4142, lng: -2.9302, burglaries: 7 },
  { company_number: "MOCK00027", name: "Swan Inn Ltd", status: "active", incorporated: "2008-08-20", sic: ["56302"], postcode: "L13 5SF", address: "86 St Oswald Street", lat: 53.4178, lng: -2.9289, burglaries: 6 },

  // L15 — Wavertree
  { company_number: "MOCK00028", name: "Wavertree Road Garage Ltd", status: "active", incorporated: "2016-03-08", sic: ["45200"], postcode: "L15 4JF", address: "55 Wavertree Road", lat: 53.3996, lng: -2.9368, burglaries: 5 },

  // L17 — Aigburth
  { company_number: "MOCK00029", name: "Aigburth Road Dental Practice", status: "active", incorporated: "2014-09-01", sic: ["86230"], postcode: "L17 4JJ", address: "18 Aigburth Road", lat: 53.3748, lng: -2.9384, burglaries: 1 },
  { company_number: "MOCK00030", name: "Lark Lane Bar & Kitchen Ltd", status: "active", incorporated: "2021-04-19", sic: ["56101"], postcode: "L17 8UP", address: "6 Lark Lane", lat: 53.3738, lng: -2.9441, burglaries: 4 },

  // L18 — Allerton / Mossley Hill  
  { company_number: "MOCK00031", name: "Allerton Road Jewellers Ltd", status: "active", incorporated: "2009-11-30", sic: ["47770"], postcode: "L18 2DA", address: "144 Allerton Road", lat: 53.3773, lng: -2.9201, burglaries: 8 },

  // L19 — Garston
  { company_number: "MOCK00032", name: "Garston Motors Ltd", status: "active", incorporated: "2018-05-20", sic: ["45111"], postcode: "L19 2NJ", address: "77 Speke Road", lat: 53.3531, lng: -2.8881, burglaries: 6 },

  // L20 — Bootle
  { company_number: "MOCK00033", name: "Strand Shopping Centre Retail Co", status: "active", incorporated: "2005-02-28", sic: ["47190"], postcode: "L20 4RZ", address: "The Strand Bootle", lat: 53.4438, lng: -3.0109, burglaries: 13 },
  { company_number: "MOCK00034", name: "Bootle New Strand Electronics", status: "active", incorporated: "2022-11-15", sic: ["47410"], postcode: "L20 4ST", address: "22 New Strand", lat: 53.4441, lng: -3.0118, burglaries: 12 },
  { company_number: "MOCK00035", name: "Balliol Road Off Licence Ltd", status: "active", incorporated: "2020-07-03", sic: ["47210"], postcode: "L20 2AH", address: "55 Balliol Road", lat: 53.4452, lng: -3.0088, burglaries: 15 },

  // L21 — Seaforth / Litherland
  { company_number: "MOCK00036", name: "Seaforth Road Convenience Ltd", status: "active", incorporated: "2019-09-18", sic: ["47110"], postcode: "L21 3TJ", address: "88 Seaforth Road", lat: 53.4608, lng: -3.0101, burglaries: 9 },

  // L22 — Waterloo
  { company_number: "MOCK00037", name: "South Road Waterloo Cars Ltd", status: "active", incorporated: "2016-06-14", sic: ["45112"], postcode: "L22 5ND", address: "102 South Road", lat: 53.4742, lng: -3.0242, burglaries: 4 },

  // L23 — Crosby
  { company_number: "MOCK00038", name: "Crosby Village Pharmacy Ltd", status: "active", incorporated: "2011-04-09", sic: ["47730"], postcode: "L23 0TP", address: "34 Coronation Road", lat: 53.4879, lng: -3.0301, burglaries: 2 },
  { company_number: "MOCK00039", name: "Marina View Restaurant Ltd", status: "active", incorporated: "2023-08-20", sic: ["56101"], postcode: "L23 6SX", address: "15 Marine Crescent", lat: 53.4877, lng: -3.0489, burglaries: 3 },

  // L25 — Woolton
  { company_number: "MOCK00040", name: "Woolton Village Butchers", status: "active", incorporated: "2007-10-01", sic: ["47220"], postcode: "L25 5JA", address: "10 Woolton Street", lat: 53.3705, lng: -2.8918, burglaries: 1 },

  // L30 — Netherton
  { company_number: "MOCK00041", name: "Netherton Activity Centre Ltd", status: "active", incorporated: "2022-01-07", sic: ["47190"], postcode: "L30 3TL", address: "22 Bridle Way", lat: 53.4926, lng: -2.9978, burglaries: 6 },

  // L34 — Prescot
  { company_number: "MOCK00042", name: "Prescot Shopping Centre Ltd", status: "active", incorporated: "2003-06-12", sic: ["47190"], postcode: "L34 5GA", address: "2 Cables Retail Park", lat: 53.4282, lng: -2.8008, burglaries: 8 },
  { company_number: "MOCK00043", name: "Prescot Road Motors Ltd", status: "active", incorporated: "2015-08-30", sic: ["45112"], postcode: "L34 2RY", address: "200 Prescot Road", lat: 53.4329, lng: -2.8193, burglaries: 5 },

  // L36 — Huyton
  { company_number: "MOCK00044", name: "Huyton Village Newsagent", status: "active", incorporated: "2024-03-01", sic: ["47210"], postcode: "L36 9UB", address: "5 Derby Road", lat: 53.4098, lng: -2.8381, burglaries: 7 },

  // L37 — Formby
  { company_number: "MOCK00045", name: "Formby Point Coastal Gifts", status: "active", incorporated: "2021-05-12", sic: ["47789"], postcode: "L37 3HX", address: "18 Chapel Lane", lat: 53.5581, lng: -3.0714, burglaries: 2 },

  // Warehouses / Industrial
  { company_number: "MOCK00046", name: "Mersey Logistics Warehousing Ltd", status: "active", incorporated: "2014-01-20", sic: ["52100"], postcode: "L20 8JD", address: "Atlantic Dock", lat: 53.4511, lng: -3.0049, burglaries: 18 },
  { company_number: "MOCK00047", name: "Seaforth Container Services Ltd", status: "active", incorporated: "2010-08-15", sic: ["52241"], postcode: "L21 1JD", address: "Royal Seaforth Dock", lat: 53.4661, lng: -3.0254, burglaries: 14 },
  { company_number: "MOCK00048", name: "Edge Lane Distribution Centre", status: "active", incorporated: "2019-04-30", sic: ["52100"], postcode: "L13 9AB", address: "Edge Lane Industrial Est", lat: 53.4088, lng: -2.9021, burglaries: 11 },

  // Hotels
  { company_number: "MOCK00049", name: "Titanic Hotel Liverpool Ltd", status: "active", incorporated: "2012-07-04", sic: ["55100"], postcode: "L3 4AD", address: "Stanley Dock", lat: 53.4249, lng: -2.9997, burglaries: 4 },
  { company_number: "MOCK00050", name: "Hope Street Hotel Ltd", status: "active", incorporated: "2004-11-18", sic: ["55100"], postcode: "L1 9DA", address: "40 Hope Street", lat: 53.3988, lng: -2.9741, burglaries: 3 },
];

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServerClient();
  let seeded = 0;
  let skipped = 0;

  for (const biz of MOCK_BUSINESSES) {
    const scoring = scoreLead({
      sic_codes: biz.sic,
      incorporation_date: biz.incorporated,
      company_status: biz.status,
      is_commercial_unit: true,
      recent_burglaries_count: biz.burglaries,
      visit_status: "unvisited",
    });

    const { error } = await supabase.from("leads").upsert(
      {
        company_number: biz.company_number,
        company_name: biz.name,
        company_status: biz.status,
        incorporation_date: biz.incorporated,
        sic_codes: biz.sic,
        sic_description: getSicDescription(biz.sic),
        address_line_1: biz.address,
        locality: "Liverpool",
        postcode: biz.postcode,
        is_commercial_unit: true,
        lat: biz.lat,
        lng: biz.lng,
        geom: `POINT(${biz.lng} ${biz.lat})`,
        lead_score: scoring.lead_score,
        risk_profile_tag: scoring.risk_profile_tag,
        sales_hook: scoring.sales_hook,
        recent_burglaries_count: biz.burglaries,
        visit_status: "unvisited",
        visited: false,
      },
      { onConflict: "company_number" }
    );

    if (error) {
      console.error(`[Mock Seed] Failed ${biz.company_number}:`, error.message);
      skipped++;
    } else {
      seeded++;
    }
  }

  return NextResponse.json({
    message: "Mock seed complete",
    seeded,
    skipped,
    total: MOCK_BUSINESSES.length,
    note: "These are fictional demo businesses. Run POST /api/seed with a Companies House API key for real data.",
  });
}
