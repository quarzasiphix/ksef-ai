import React, { useEffect, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { X, Pin, PinOff, ExternalLink, Loader2 } from 'lucide-react';
import AuditTimeline from './AuditTimeline';
import type { AuditPanelState, AuditEvent } from '../../types/audit';

interface AuditPanelProps {
  state: AuditPanelState;
  selectedLedgerEntryId: string | null;
  selectedLedgerEntryContext?: {
    documentNumber: string;
    eventType: string;
  };
  width: number;
  onStateChange: (state: AuditPanelState) => void;
  onWidthChange: (width: number) => void;
  onClose: () => void;
  onLedgerEntryClick?: (entryId: string) => void;
  events: AuditEvent[];
  isLoading?: boolean;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({
  state,
  selectedLedgerEntryId,
  selectedLedgerEntryContext,
  width,
  onStateChange,
  onWidthChange,
  onClose,
  onLedgerEntryClick,
  events,
  isLoading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (state === 'pinned') {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 360;
      const maxWidth = 720;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      onWidthChange(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onWidthChange]);

  const handleTogglePin = () => {
    onStateChange(state === 'pinned' ? 'open' : 'pinned');
  };

  if (state === 'closed') {
    return null;
  }

  return (
    <>
      {/* Backdrop for drawer mode */}
      {state === 'open' && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "fixed top-16 bottom-0 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 z-50",
          "flex flex-col",
          state === 'open' && "shadow-2xl",
          state === 'pinned' && "relative"
        )}
        style={{
          width: state === 'pinned' ? `${width}px` : '100%',
          maxWidth: state === 'open' ? '720px' : undefined,
          right: state === 'open' ? 0 : undefined,
        }}
      >
        {/* Resize handle for pinned mode */}
        {state === 'pinned' && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Audyt
              </h2>
              {selectedLedgerEntryContext && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {selectedLedgerEntryContext.documentNumber} • {selectedLedgerEntryContext.eventType}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePin}
                title={state === 'pinned' ? 'Odepnij' : 'Przypnij'}
              >
                {state === 'pinned' ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                title="Zamknij"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-900 dark:text-slate-100 mx-auto mb-4" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Ładowanie audytu...
                  </p>
                </div>
              </div>
            ) : !selectedLedgerEntryId ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Wybierz wpis księgowy, aby zobaczyć audyt
                  </p>
                </div>
              </div>
            ) : (
              <AuditTimeline
                events={events}
                onLedgerEntryClick={onLedgerEntryClick}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
};

export default AuditPanel;
