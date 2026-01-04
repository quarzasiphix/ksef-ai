import React from 'react';
import EventChainViewer from '@/components/events/EventChainViewer';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

export const EventsTimeline: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <EventChainViewer
        businessProfileId={selectedProfileId}
        showFilters={true}
        limit={100}
      />
    </div>
  );
};

export default EventsTimeline;
