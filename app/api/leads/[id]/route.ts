import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UpdateLeadPayload } from "@/lib/types";

// GET /api/leads/[id] — fetch a single lead
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServerClient();
  const { id } = await params;

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}

// PATCH /api/leads/[id] — update visit status, notes, revisit date
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = getSupabaseServerClient();
  const { id } = await params;

  let body: UpdateLeadPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Allowed fields only — prevent mass assignment
  const allowedFields: (keyof UpdateLeadPayload)[] = [
    "visit_status",
    "visited",
    "notes",
    "revisit_date",
  ];

  const update: Partial<UpdateLeadPayload> = {};
  for (const field of allowedFields) {
    if (field in body) {
      (update as Record<string, unknown>)[field] = body[field];
    }
  }

  // Auto-set visited=true when a non-unvisited status is set
  if (body.visit_status && body.visit_status !== "unvisited") {
    update.visited = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ lead: data });
}
