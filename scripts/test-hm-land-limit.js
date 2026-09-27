const https = require('https');
const querystring = require('querystring');

const query = `
PREFIX  ppd:  <http://landregistry.data.gov.uk/def/ppi/>
PREFIX  lrcommon: <http://landregistry.data.gov.uk/def/common/>
SELECT ?amount ?date
WHERE
{
  ?transx ppd:pricePaid ?amount ;
          ppd:transactionDate ?date ;
          ppd:propertyAddress ?addr .
  ?addr lrcommon:postcode ?postcode .
  FILTER(regex(?postcode, "^L27 "))
}
ORDER BY DESC(?date)
LIMIT 1000
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
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Successfully fetched " + parsed.results.bindings.length + " records!");
      // Print first and last just to verify
      console.log('First:', parsed.results.bindings[0]);
      console.log('Last:', parsed.results.bindings[parsed.results.bindings.length - 1]);
    } catch (e) {
      console.error('Failed to parse JSON, received:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(postData);
req.end();
