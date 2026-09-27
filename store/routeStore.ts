import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Planner item types ───────────────────────────────────────────
export type CommercialItem = {
  type: 'commercial';
  id: string; // Lead.id
};

export type ResidentialItem = {
  type: 'residential';
  lat: number;
  lng: number;
  title: string;
  completed?: boolean;
};

export type PlannerItem = CommercialItem | ResidentialItem;

// ─── Store interface ──────────────────────────────────────────────
interface RouteState {
  items: PlannerItem[];

  // Commercial (existing API — unchanged so other pages keep working)
  addToRoute: (leadId: string) => void;
  removeFromRoute: (leadId: string) => void;
  isInRoute: (leadId: string) => boolean;

  // Residential
  addResidentialStop: (stop: Omit<ResidentialItem, 'type' | 'completed'>) => void;
  removeResidentialStop: (lat: number, lng: number) => void;
  isResidentialInPlan: (lat: number, lng: number) => boolean;
  toggleResidentialCompleted: (lat: number, lng: number) => void;

  // General
  removeItem: (index: number) => void;
  reorderRoute: (startIndex: number, endIndex: number) => void;
  clearRoute: () => void;

  // Computed (derived — no state, just getters)
  routeLeadIds: string[]; // kept for backward compat
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      items: [],

      // ── Derived getter (backward compat) ──────────────────────
      get routeLeadIds() {
        return get()
          .items.filter((i): i is CommercialItem => i.type === 'commercial')
          .map((i) => i.id);
      },

      // ── Commercial ────────────────────────────────────────────
      addToRoute: (leadId) => {
        const { items } = get();
        const alreadyIn = items.some(
          (i) => i.type === 'commercial' && i.id === leadId
        );
        if (!alreadyIn) {
          set({ items: [...items, { type: 'commercial', id: leadId }] });
        }
      },

      removeFromRoute: (leadId) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.type === 'commercial' && i.id === leadId)
          ),
        }));
      },

      isInRoute: (leadId) => {
        return get().items.some(
          (i) => i.type === 'commercial' && i.id === leadId
        );
      },

      // ── Residential ───────────────────────────────────────────
      addResidentialStop: (stop) => {
        const { items } = get();
        const alreadyIn = items.some(
          (i) =>
            i.type === 'residential' &&
            i.lat === stop.lat &&
            i.lng === stop.lng
        );
        if (!alreadyIn) {
          set({ items: [...items, { type: 'residential', ...stop }] });
        }
      },

      removeResidentialStop: (lat, lng) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.type === 'residential' && i.lat === lat && i.lng === lng)
          ),
        }));
      },

      isResidentialInPlan: (lat, lng) => {
        return get().items.some(
          (i) => i.type === 'residential' && i.lat === lat && i.lng === lng
        );
      },

      toggleResidentialCompleted: (lat, lng) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.type === 'residential' && i.lat === lat && i.lng === lng
              ? { ...i, completed: !i.completed }
              : i
          ),
        }));
      },

      // ── General ───────────────────────────────────────────────
      removeItem: (index) => {
        set((state) => {
          const next = [...state.items];
          next.splice(index, 1);
          return { items: next };
        });
      },

      reorderRoute: (startIndex, endIndex) => {
        set((state) => {
          const next = [...state.items];
          const [removed] = next.splice(startIndex, 1);
          next.splice(endIndex, 0, removed);
          return { items: next };
        });
      },

      clearRoute: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'securemap-route-storage',
    }
  )
);
