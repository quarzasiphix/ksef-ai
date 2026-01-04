import { useSyncExternalStore } from 'react';

type EventDrawerState = {
  eventId: string | null;
  isOpen: boolean;
};

type EventDrawerStore = EventDrawerState & {
  openDrawer: (eventId: string) => void;
  closeDrawer: () => void;
};

let state: EventDrawerState = {
  eventId: null,
  isOpen: false,
};

const subscribers = new Set<() => void>();

const emitChange = () => {
  subscribers.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

const getSnapshot = () => state;

const openDrawer = (eventId: string) => {
  state = { eventId, isOpen: true };
  emitChange();
};

const closeDrawer = () => {
  state = { eventId: null, isOpen: false };
  emitChange();
};

export const useEventDrawer = (): EventDrawerStore => {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    openDrawer,
    closeDrawer,
  };
};
