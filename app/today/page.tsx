"use client";

import { useEffect, useState, useCallback } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  CalendarDays,
  MapPin,
  Loader2,
  Trash2,
  Building2,
  Home,
  Navigation,
  ExternalLink,
  X,
  GripVertical,
  Bell,
  CheckCircle2,
  ShieldOff,
} from "lucide-react";
import Link from "next/link";
import { useRouteStore, PlannerItem, ResidentialItem } from "@/store/routeStore";
import type { Lead } from "@/lib/types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { ScoreBadge } from "@/components/leads/ScoreBadge";
import { cn } from "@/lib/utils";

// ─── Residential stop card ────────────────────────────────────────
function ResidentialCard({
  item,
  index,
  onRemove,
  onToggleComplete,
  dragHandleProps,
}: {
  item: ResidentialItem;
  index: number;
  onRemove: () => void;
  onToggleComplete?: () => void;
  dragHandleProps?: any;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  const isDone = !!item.completed;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 overflow-hidden transition-all duration-200",
        isDone
          ? "bg-emerald-950/20 border-emerald-500/30"
          : "bg-[var(--color-bg-surface)] border-[var(--color-border)]"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          className="p-1 -ml-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
            isDone
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
          )}
        >
          <Home className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-400">{index + 1}.</span>
            <h3
              className={cn(
                "text-sm font-bold truncate",
                isDone ? "text-slate-300 line-through decoration-slate-500" : "text-white"
              )}
            >
              {item.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/15">
              Residential Area
            </span>
            <a
              href="/residential"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
            >
              View stats
            </a>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleComplete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete();
              }}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isDone
                  ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-slate-700/50 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400"
              )}
              title={isDone ? "Mark as unvisited" : "Mark as canvassed"}
              aria-label={isDone ? "Mark as unvisited" : "Mark as canvassed"}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
            title="Open in Maps"
            aria-label="Open in Maps"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Remove from plan"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Commercial stop card ─────────────────────────────────────────
function CommercialCard({
  lead,
  index,
  onRemove,
  onUpdateStatus,
  onClick,
  dragHandleProps,
}: {
  lead: Lead;
  index: number;
  onRemove: () => void;
  onUpdateStatus: (leadId: string, status: string) => Promise<void>;
  onClick: (lead: Lead) => void;
  dragHandleProps?: any;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const isDone = lead.visit_status !== "unvisited" && lead.visit_status !== "attempted_no_answer";

  const handleQuickStatus = async (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    setIsUpdating(true);
    await onUpdateStatus(lead.id, status);
    setIsUpdating(false);
  };

  const toAddress = (l: Lead) =>
    [l.address_line_1, l.locality, l.postcode].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(toAddress(lead))}`;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-3 overflow-hidden transition-all duration-200 cursor-pointer",
        isDone
          ? "bg-emerald-950/15 border-emerald-500/30"
          : "bg-[var(--color-bg-surface)] border-[var(--color-border)] hover:border-[var(--color-border-subtle)]",
        isUpdating && "opacity-50 pointer-events-none"
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          className="p-1 -ml-1 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0",
            isDone
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20 text-[var(--color-accent)]"
          )}
        >
          <Building2 className="w-4 h-4" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-slate-400">{index + 1}.</span>
            <h3
              className={cn(
                "text-sm font-bold truncate",
                isDone ? "text-slate-300 line-through decoration-slate-500" : "text-white"
              )}
            >
              {lead.company_name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <MapPin className="w-3 h-3 flex-shrink-0 text-slate-500" />
            <span className="truncate">{lead.address_line_1 || lead.postcode}</span>
          </div>
        </div>

        {/* Score + Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <ScoreBadge score={lead.lead_score} size="sm" />

          {/* Quick status or Status pill */}
          {isDone ? (
            <span
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider",
                lead.visit_status === "not_interested"
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              )}
            >
              {lead.visit_status === "pitched_follow_up"
                ? "Pitched"
                : lead.visit_status === "not_interested"
                ? "Declined"
                : lead.visit_status?.replace(/_/g, " ")}
            </span>
          ) : (
            <>
              <button
                onClick={(e) => handleQuickStatus(e, "not_interested")}
                className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Mark Not Interested"
                aria-label="Not Interested"
              >
                <ShieldOff className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleQuickStatus(e, "pitched_follow_up")}
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Mark Pitched"
                aria-label="Pitched"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Navigate in Maps */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors"
            title="Open in Maps"
            aria-label="Open in Maps"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Remove from plan */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
            title="Remove from plan"
            aria-label="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Planner page ────────────────────────────────────────────
export default function PlannerPage() {
  const { items, removeItem, reorderRoute, clearRoute, toggleResidentialCompleted } = useRouteStore();

  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch leads to resolve commercial item ids
  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/leads?limit=1000");
        if (res.ok) {
          const data = await res.json();
          setAllLeads(data.leads || []);
        }
      } catch (err) {
        console.error("Failed to load leads:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  // ── Derived lists ────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const followUps = allLeads.filter((l) => {
    if (!l.revisit_date) return false;
    const revisitDay = l.revisit_date.split("T")[0];
    return revisitDay <= today && l.visit_status !== "not_interested";
  });

  // Resolve commercial items to Lead objects
  const resolvedItems = items.map((item) => {
    if (item.type === "residential") return item;
    const lead = allLeads.find((l) => l.id === item.id);
    return lead ? { ...item, lead } : null;
  }).filter(Boolean) as Array<
    ResidentialItem | (PlannerItem & { type: "commercial"; lead: Lead })
  >;

  // ── Handlers ─────────────────────────────────────────────────────
  const handleUpdateStatus = useCallback(async (leadId: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visit_status: status }),
      });
      if (res.ok) {
        setAllLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, visit_status: status as any } : l))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderRoute(result.source.index, result.destination.index);
  };

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  };

  const handleLeadUpdate = (updatedLead: Lead) => {
    setAllLeads((prev) =>
      prev.map((l) => (l.id === updatedLead.id ? updatedLead : l))
    );
    setSelectedLead(updatedLead);
  };

  // ── Open Route in Google Maps ────────────────────────────────────
  const handleOpenRoute = () => {
    const waypoints: string[] = [];

    for (const item of resolvedItems) {
      if (item.type === "residential") {
        waypoints.push(`${item.lat},${item.lng}`);
      } else {
        const lead = (item as any).lead as Lead;
        const addr = [lead.address_line_1, lead.locality, lead.postcode]
          .filter(Boolean)
          .join(", ");
        waypoints.push(encodeURIComponent(addr));
      }
    }

    if (waypoints.length === 0) return;
    if (waypoints.length === 1) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${waypoints[0]}`, "_blank");
      return;
    }

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const middle = waypoints.slice(1, -1).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
    if (middle) url += `&waypoints=${middle}`;
    window.open(url, "_blank");
  };

  const totalStops = resolvedItems.length;
  const doneCount = resolvedItems.filter(item => {
    if (item.type === "residential") return !!item.completed;
    const lead = (item as any).lead as Lead;
    return lead.visit_status !== "unvisited" && lead.visit_status !== "attempted_no_answer";
  }).length;
  const remainingCount = Math.max(0, totalStops - doneCount);
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <main className="min-h-svh bg-[var(--color-bg-base)] pb-32 flex flex-col">

      {/* ── Header ── */}
      <div className="sticky top-0 z-50 glass px-4 py-4 pt-safe">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[var(--color-accent)]" />
              <h1 className="text-lg font-bold text-white font-display">Planner</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{dateLabel}</p>
          </div>
          {totalStops > 0 && (
            <div className="flex items-center gap-2">
              {/* Open Route button */}
              <button
                onClick={handleOpenRoute}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold transition-all active:scale-95 shadow-lg"
              >
                <Navigation className="w-3.5 h-3.5" />
                Open Route
              </button>
              {/* Clear all */}
              <button
                onClick={clearRoute}
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Clear all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalStops > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-slate-500 font-medium">
                {doneCount} done · {remainingCount} remaining
              </span>
              <span className="text-[11px] font-bold text-[var(--color-accent)]">
                {Math.round((doneCount / totalStops) * 100)}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-overlay)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / totalStops) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-6">
        {loading ? (
          <div className="flex items-center justify-center flex-1 pt-16">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : (
          <>
            {/* ── Follow-ups Due ── */}
            {followUps.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-orange-400" />
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Follow-ups Due
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                    {followUps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {followUps.map((lead, idx) => (
                    <CommercialCard
                      key={`followup-${lead.id}`}
                      lead={lead}
                      index={idx}
                      onRemove={() => {}} // follow-ups aren't in the ordered list
                      onUpdateStatus={handleUpdateStatus}
                      onClick={handleCardClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Today's Stops ── */}
            <section className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Today's Stops
                </h2>
                {totalStops > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold">
                    {totalStops}
                  </span>
                )}
              </div>

              {totalStops === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl">
                  <div className="w-14 h-14 bg-[var(--color-bg-surface)] rounded-2xl flex items-center justify-center mb-4">
                    <CalendarDays className="w-7 h-7 text-slate-500" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">No stops planned</h3>
                  <p className="text-sm text-slate-500 mb-5 max-w-[200px]">
                    Add commercial leads or residential areas to build your day.
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href="/list"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold transition-colors hover:bg-[var(--color-accent-hover)] active:scale-95"
                    >
                      <Building2 className="w-4 h-4" />
                      Commercial
                    </Link>
                    <Link
                      href="/residential"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold transition-colors hover:bg-blue-500 active:scale-95"
                    >
                      <Home className="w-4 h-4" />
                      Residential
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Drag-and-drop list ── */}
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="planner-list">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-2"
                        >
                          {resolvedItems.map((item, index) => (
                            <Draggable
                              key={
                                item.type === "residential"
                                  ? `res-${item.lat}-${item.lng}`
                                  : `com-${(item as any).id}`
                              }
                              draggableId={
                                item.type === "residential"
                                  ? `res-${item.lat}-${item.lng}`
                                  : `com-${(item as any).id}`
                              }
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                >
                                  {item.type === "residential" ? (
                                    <ResidentialCard
                                      item={item}
                                      index={index}
                                      onRemove={() => removeItem(index)}
                                      onToggleComplete={() => toggleResidentialCompleted(item.lat, item.lng)}
                                      dragHandleProps={provided.dragHandleProps}
                                    />
                                  ) : (
                                    <CommercialCard
                                      lead={(item as any).lead}
                                      index={index}
                                      onRemove={() => removeItem(index)}
                                      onUpdateStatus={handleUpdateStatus}
                                      onClick={handleCardClick}
                                      dragHandleProps={provided.dragHandleProps}
                                    />
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>

                  {/* ── Quick-add buttons ── */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                    <Link
                      href="/list"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-accent)]/40 text-[var(--color-accent)] text-sm font-semibold hover:bg-[var(--color-accent)]/8 transition-colors active:scale-95"
                    >
                      <Building2 className="w-4 h-4" />
                      + Commercial
                    </Link>
                    <Link
                      href="/residential"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-500/40 text-blue-400 text-sm font-semibold hover:bg-blue-500/8 transition-colors active:scale-95"
                    >
                      <Home className="w-4 h-4" />
                      + Residential
                    </Link>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />

      <LeadDrawer
        lead={selectedLead}
        open={drawerOpen}
        onClose={handleDrawerClose}
        onLeadUpdate={handleLeadUpdate}
      />
    </main>
  );
}
