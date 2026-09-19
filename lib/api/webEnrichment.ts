export async function scrapeContactInfo(companyName: string, postcode: string) {
  try {
    const query = encodeURIComponent(`${companyName} ${postcode} Liverpool`);
    
    // Add strict timeout to prevent hanging the API route
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    // Fallback to basic html DDG site which does not require JS
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.5',
      },
      cache: 'no-store',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Web Enrichment] DDG returned ${res.status}`);
      return { phone: null, website: null, socialLinks: [] };
    }

    const html = await res.text();
    
    // 1. Extract phones (UK mobile or Liverpool landline)
    // Mobile: 07xxx xxxxxx or +447xxx xxxxxx
    // Landline: 0151 xxx xxxx or (0151) xxx xxxx or +44 151 xxx xxxx
    const phoneRegex = /(?:(?:\+44|0)7\d{3}\s?\d{6}|\(?(?:\+44\s?|0)151\)?\s?\d{3}\s?\d{4})/g;
    const phoneMatches = html.match(phoneRegex);
    const phone = phoneMatches ? phoneMatches[0].replace(/\s+/g, ' ') : null; // pick first and normalize spaces

    // 2. Extract social links
    const socialRegex = /https?:\/\/(?:www\.)?(?:facebook\.com|instagram\.com|checkatrade\.com)[^"'\s<]+/g;
    const socialMatches = html.match(socialRegex);
    // Decode URLs (DDG sometimes uses URL encoded parameters)
    const rawSocialLinks = socialMatches ? [...new Set(socialMatches)] : [];
    const socialLinks = rawSocialLinks.map(link => {
      try { return decodeURIComponent(link); } catch { return link; }
    }).filter(link => !link.includes('duckduckgo'));

    // 3. Extract official website
    // Look for href inside <a class="result__url" href="...">
    const urlMatches = html.match(/<a class="result__url" href="([^"]+)"/g);
    let website = null;
    
    if (urlMatches) {
      for (const match of urlMatches) {
        const urlExtract = match.match(/href="([^"]+)"/);
        if (!urlExtract) continue;
        
        let url = urlExtract[1];
        
        // Decode DDG redirect (//duckduckgo.com/l/?uddg=...)
        if (url.includes('uddg=')) {
          const uddgMatch = url.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            try {
              url = decodeURIComponent(uddgMatch[1]);
            } catch { /* ignore */ }
          }
        } else if (url.startsWith('//')) {
          url = `https:${url}`;
        }

        const urlLower = url.toLowerCase();
        
        // Skip directory and registry sites
        const isExcluded = [
          'duckduckgo', 'facebook', 'instagram', 'gov.uk', 'companieshouse', 
          'endole', 'bizdb', 'checkatrade', 'yell.com', 'thomsonlocal',
          'companycheck', '192.com', 'yelp'
        ].some(domain => urlLower.includes(domain));

        if (!isExcluded) {
          website = url;
          break; // First non-excluded URL is considered the primary website
        }
      }
    }

    return {
      phone,
      website,
      socialLinks: [...new Set(socialLinks)] // deduplicate
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn("[Web Enrichment] DuckDuckGo scraper timed out after 3500ms.");
    } else {
      console.error("[Web Enrichment] Scraping error:", error);
    }
    return { phone: null, website: null, socialLinks: [] };
  }
}
