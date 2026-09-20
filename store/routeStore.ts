import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RouteState {
  routeLeadIds: string[];
  addToRoute: (leadId: string) => void;
  removeFromRoute: (leadId: string) => void;
  reorderRoute: (startIndex: number, endIndex: number) => void;
  clearRoute: () => void;
  isInRoute: (leadId: string) => boolean;
}

export const useRouteStore = create<RouteState>()(
  persist(
    (set, get) => ({
      routeLeadIds: [],
      
      addToRoute: (leadId) => {
        const { routeLeadIds } = get();
        if (!routeLeadIds.includes(leadId)) {
          set({ routeLeadIds: [...routeLeadIds, leadId] });
        }
      },
      
      removeFromRoute: (leadId) => {
        set((state) => ({
          routeLeadIds: state.routeLeadIds.filter((id) => id !== leadId),
        }));
      },
      
      reorderRoute: (startIndex, endIndex) => {
        set((state) => {
          const newRoute = Array.from(state.routeLeadIds);
          const [removed] = newRoute.splice(startIndex, 1);
          newRoute.splice(endIndex, 0, removed);
          return { routeLeadIds: newRoute };
        });
      },
      
      clearRoute: () => {
        set({ routeLeadIds: [] });
      },
      
      isInRoute: (leadId) => {
        return get().routeLeadIds.includes(leadId);
      },
    }),
    {
      name: 'securemap-route-storage',
    }
  )
);
