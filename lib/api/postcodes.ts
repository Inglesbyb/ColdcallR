import type {
  PostcodeResult,
  PostcodeLookupResponse,
  BulkPostcodeResponse,
} from "../types";

const BASE_URL = "https://api.postcodes.io";

/**
 * Look up a single postcode.
 * Returns null if the postcode is invalid or not found.
 */
export async function lookupPostcode(
  postcode: string
): Promise<PostcodeResult | null> {
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();

  const res = await fetch(`${BASE_URL}/postcodes/${cleaned}`, {
    next: { revalidate: 2592000 }, // Cache 30 days — postcodes rarely change
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      `postcodes.io error: ${res.status} for postcode ${postcode}`
    );
  }

  const data: PostcodeLookupResponse = await res.json();
  return data.result;
}

/**
 * Batch geocode up to 100 postcodes in a single request.
 * Returns a Map of postcode → result (null if not found).
 */
export async function bulkLookupPostcodes(
  postcodes: string[]
): Promise<Map<string, PostcodeResult | null>> {
  const BATCH_SIZE = 100; // postcodes.io max
  const resultMap = new Map<string, PostcodeResult | null>();

  for (let i = 0; i < postcodes.length; i += BATCH_SIZE) {
    const batch = postcodes.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${BASE_URL}/postcodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });

    if (!res.ok) {
      throw new Error(`postcodes.io bulk error: ${res.status}`);
    }

    const data: BulkPostcodeResponse = await res.json();

    for (const item of data.result) {
      // Normalise key to uppercase no-space format
      const key = item.query.replace(/\s/g, "").toUpperCase();
      resultMap.set(key, item.result);
    }

    // Slight pause between batches to be a good API citizen
    if (i + BATCH_SIZE < postcodes.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return resultMap;
}

/**
 * Validate an array of postcodes and return only valid L-prefix postcodes.
 */
export function filterLiverpoolPostcodes(postcodes: string[]): string[] {
  return postcodes.filter((p) =>
    /^L\d{1,2}\s?\d[A-Z]{2}$/i.test(p.trim())
  );
}
