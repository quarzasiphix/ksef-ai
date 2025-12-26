import React from 'react';

/**
 * Loading spinner that shows in the content area only
 * Used for route transitions to avoid unmounting sidebar/header
 */
export const ContentLoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      </div>
    </div>
  );
};
