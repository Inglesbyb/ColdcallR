import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('outcode_stats')
      .select('*');

    if (error) {
      console.error("Error fetching outcode stats:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert array of rows into a dictionary keyed by outcode for O(1) lookup on the frontend
    const statsMap: Record<string, any> = {};
    if (data) {
      data.forEach((row) => {
        statsMap[row.outcode] = {
          avg_house_price: row.avg_house_price,
          crime_count: row.crime_count,
        };
      });
    }

    return NextResponse.json({ stats: statsMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
