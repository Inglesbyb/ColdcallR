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
LIMIT 5
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
    console.log(JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(postData);
req.end();
