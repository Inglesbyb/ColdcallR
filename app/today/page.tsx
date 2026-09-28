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
  CheckCheck,
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
  onRemove,
  onToggleComplete,
  dragHandleProps,
}: {
  item: ResidentialItem;
  onRemove: () => void;
  onToggleComplete?: () => void;
  dragHandleProps?: any;
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
  const isDone = !!item.completed;

  return (
    <div
      className={cn(
        "rounded-2xl border overflow-hidden transition-all duration-200",
        isDone
          ? "bg-emerald-950/20 border-emerald-500/30"
          : "bg-[var(--color-bg-surface)] border-[var(--color-border)]"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle */}
        <div
          className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
          {...dragHandleProps}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isDone
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-blue-500/10 text-blue-400"
          )}
        >
          <Home className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "text-sm font-bold truncate leading-tight",
              isDone ? "text-slate-400 line-through" : "text-white"
            )}
          >
            {item.title}
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">Residential Area</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-700/50 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
            title="Open in Maps"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          {onToggleComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleComplete(); }}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                isDone
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-slate-700/50 text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-400"
              )}
              title={isDone ? "Mark unvisited" : "Mark done"}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-700/50 text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
            title="Remove"
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
  onRemove,
  onUpdateStatus,
  onClick,
  dragHandleProps,
}: {
  lead: Lead;
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
        "rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer",
        isDone
          ? "bg-emerald-950/15 border-emerald-500/30"
          : "bg-[var(--color-bg-surface)] border-[var(--color-border)] hover:border-slate-600",
        isUpdating && "opacity-50 pointer-events-none"
      )}
      onClick={() => onClick(lead)}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle */}
        <div
          className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Icon */}
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isDone
              ? "bg-emerald-500/15 text-emerald-400"
              : "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          )}
        >
          <Building2 className="w-5 h-5" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              "text-sm font-bold truncate leading-tight",
              isDone ? "text-slate-400 line-through" : "text-white"
            )}
          >
            {lead.company_name}
          </h3>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {lead.address_line_1 || lead.postcode}
          </p>
        </div>

        {/* Score + Actions */}
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <ScoreBadge score={lead.lead_score} size="sm" />

          {isDone ? (
            <span
              className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide",
                lead.visit_status === "not_interested"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-emerald-500/10 text-emerald-400"
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
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Not Interested"
              >
                <ShieldOff className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => handleQuickStatus(e, "pitched_follow_up")}
                className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Mark Pitched"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </>
          )}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-700/50 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
            title="Open in Maps"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-700/50 text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-colors"
            title="Remove"
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

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const handleOpenRoute = () => {
    const waypoints: string[] = [];
    for (const item of resolvedItems) {
      if (item.type === "residential") {
        waypoints.push(`${item.lat},${item.lng}`);
      } else {
        const lead = (item as any).lead as Lead;
        const addr = [lead.address_line_1, lead.locality, lead.postcode].filter(Boolean).join(", ");
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
  const progressPct = totalStops > 0 ? Math.round((doneCount / totalStops) * 100) : 0;

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <main className="min-h-svh bg-[var(--color-bg-base)] pb-36 flex flex-col">

      {/* ── Header ── */}
      <div className="sticky top-0 z-50 glass px-4 pt-safe">
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-bold text-white font-display">Today's Route</h1>
            <p className="text-xs text-slate-500 mt-0.5">{dateLabel}</p>
          </div>
          {totalStops > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenRoute}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-bold transition-all active:scale-95 shadow-lg"
              >
                <Navigation className="w-4 h-4" />
                Navigate
              </button>
              <button
                onClick={clearRoute}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                aria-label="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalStops > 0 && (
          <div className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {doneCount} of {totalStops} done
              </span>
              <span className="text-xs font-bold text-[var(--color-accent)]">
                {progressPct}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--color-bg-overlay)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pt-4 flex flex-col gap-5">
        {loading ? (
          <div className="flex items-center justify-center flex-1 pt-20">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : (
          <>
            {/* ── Follow-ups Due ── */}
            {followUps.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-orange-400" />
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Follow-ups Due
                  </h2>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-xs font-bold">
                    {followUps.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {followUps.map((lead) => (
                    <CommercialCard
                      key={`followup-${lead.id}`}
                      lead={lead}
                      onRemove={() => {}}
                      onUpdateStatus={handleUpdateStatus}
                      onClick={handleCardClick}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Today's Stops ── */}
            <section className="flex-1">
              {totalStops === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-[var(--color-bg-surface)] rounded-2xl flex items-center justify-center mb-5 border border-[var(--color-border)]">
                    <CalendarDays className="w-7 h-7 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Plan your day</h3>
                  <p className="text-sm text-slate-500 mb-8 max-w-[220px] leading-relaxed">
                    Add commercial leads or residential areas to build your route.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/list"
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold transition-all hover:bg-[var(--color-accent-hover)] active:scale-95 shadow-lg"
                    >
                      <Building2 className="w-4 h-4" />
                      Commercial
                    </Link>
                    <Link
                      href="/residential"
                      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20"
                    >
                      <Home className="w-4 h-4" />
                      Residential
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-[var(--color-accent)]" />
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Stops
                    </h2>
                    {progressPct === 100 && (
                      <span className="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-400">
                        <CheckCheck className="w-3.5 h-3.5" /> All done!
                      </span>
                    )}
                  </div>

                  {/* Drag-and-drop list */}
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
                                      onRemove={() => removeItem(index)}
                                      onToggleComplete={() => toggleResidentialCompleted(item.lat, item.lng)}
                                      dragHandleProps={provided.dragHandleProps}
                                    />
                                  ) : (
                                    <CommercialCard
                                      lead={(item as any).lead}
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

                  {/* Add more buttons */}
                  <div className="flex gap-3 mt-5 pt-5 border-t border-[var(--color-border)]">
                    <Link
                      href="/list"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--color-accent)]/30 text-[var(--color-accent)] text-sm font-semibold hover:bg-[var(--color-accent)]/8 transition-colors active:scale-95"
                    >
                      <Building2 className="w-4 h-4" />
                      + Commercial
                    </Link>
                    <Link
                      href="/residential"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-500/30 text-blue-400 text-sm font-semibold hover:bg-blue-500/8 transition-colors active:scale-95"
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
