"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { CalendarClock, MapPin, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouteStore } from "@/store/routeStore";
import type { Lead } from "@/lib/types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { RouteCard } from "@/components/leads/RouteCard";
import { LeadDrawer } from "@/components/leads/LeadDrawer";

export default function TodayPage() {
  const { routeLeadIds, reorderRoute, clearRoute } = useRouteStore();
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Drawer state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch all leads to match against routeLeadIds and revisit_date
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

  const handleUpdateStatus = async (leadId: string, status: string) => {
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
  };

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

  // Compute derived lists
  const today = new Date().toISOString().split("T")[0];
  
  const followUps = allLeads.filter((l) => {
    if (!l.revisit_date) return false;
    const revisitDay = l.revisit_date.split("T")[0];
    return revisitDay <= today && l.visit_status !== "not_interested";
  });

  // Map routeLeadIds to actual Lead objects, keeping the exact order
  const routeLeads = routeLeadIds
    .map((id) => allLeads.find((l) => l.id === id))
    .filter((l): l is Lead => !!l);

  return (
    <main className="min-h-svh bg-[var(--color-bg-base)] pb-32 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 glass px-4 py-4 pt-safe flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-[var(--color-accent)]" />
          <h1 className="text-lg font-bold text-white font-display">Daily Route</h1>
        </div>
        {routeLeads.length > 0 && (
          <button 
            onClick={clearRoute}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
            aria-label="Clear Route"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 p-4 flex flex-col gap-8">
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
          </div>
        ) : (
          <>
            {/* Follow-ups Section */}
            {followUps.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Follow-ups Due
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold">
                    {followUps.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {followUps.map((lead, idx) => (
                    <RouteCard 
                      key={`followup-${lead.id}`} 
                      lead={lead} 
                      index={idx}
                      onClick={handleCardClick} 
                      onUpdateStatus={handleUpdateStatus} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Today's Route Section */}
            <section className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Hit List
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-bold">
                  {routeLeads.length} stops
                </span>
              </div>

              {routeLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-[var(--color-border)] rounded-2xl">
                  <div className="w-12 h-12 bg-[var(--color-bg-surface)] rounded-full flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Route is empty</h3>
                  <p className="text-sm text-slate-500 mb-4 max-w-[200px]">
                    Add leads from the map or list to build your route.
                  </p>
                  <Link
                    href="/list"
                    className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Browse Leads
                  </Link>
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="route-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {routeLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <RouteCard 
                                  lead={lead} 
                                  index={index} 
                                  dragHandleProps={provided.dragHandleProps}
                                  onClick={handleCardClick}
                                  onUpdateStatus={handleUpdateStatus}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
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
