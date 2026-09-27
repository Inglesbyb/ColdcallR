import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('postcode')
      .not('postcode', 'is', null);

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const outcodeSet = new Set<string>();
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

    const outcodes = Array.from(outcodeSet).sort();
    return NextResponse.json({ outcodes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
