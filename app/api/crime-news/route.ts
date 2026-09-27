import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('crime_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ articles: data ?? [] });
  } catch (error) {
    console.error('Failed to fetch crime news:', error);
    return NextResponse.json({ error: 'Failed to fetch crime news' }, { status: 500 });
  }
}
