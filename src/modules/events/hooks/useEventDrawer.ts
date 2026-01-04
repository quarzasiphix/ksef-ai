import { create } from 'zustand';

interface EventDrawerStore {
  eventId: string | null;
  isOpen: boolean;
  openDrawer: (eventId: string) => void;
  closeDrawer: () => void;
}

export const useEventDrawer = create<EventDrawerStore>((set) => ({
  eventId: null,
  isOpen: false,
  openDrawer: (eventId: string) => set({ eventId, isOpen: true }),
  closeDrawer: () => set({ eventId: null, isOpen: false }),
}));
