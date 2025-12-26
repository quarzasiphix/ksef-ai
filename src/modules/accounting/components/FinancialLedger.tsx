import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Filter, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Clock
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import LedgerEventRow from './LedgerEventRow';
import type { LedgerEvent, LedgerFilters, DocumentType, LedgerEventType } from '../types/ledger';
import { getDocumentTypeLabel, getEventLabel } from '../types/ledger';

interface FinancialLedgerProps {
  events: LedgerEvent[];
  filters?: LedgerFilters;
  onFiltersChange?: (filters: LedgerFilters) => void;
  embedded?: boolean; // For mini ledger in document pages
  maxHeight?: string;
}

export const FinancialLedger: React.FC<FinancialLedgerProps> = ({
  events,
  filters = {},
  onFiltersChange,
  embedded = false,
  maxHeight,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilters, setLocalFilters] = useState<LedgerFilters>(filters);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.documentNumber.toLowerCase().includes(query) ||
        event.counterparty.toLowerCase().includes(query) ||
        event.eventLabel.toLowerCase().includes(query)
      );
    }

    // Date range
    if (localFilters.startDate) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) >= new Date(localFilters.startDate!)
      );
    }
    if (localFilters.endDate) {
      filtered = filtered.filter(event => 
        new Date(event.timestamp) <= new Date(localFilters.endDate!)
      );
    }

    // Document types
    if (localFilters.documentTypes && localFilters.documentTypes.length > 0) {
      filtered = filtered.filter(event => 
        localFilters.documentTypes!.includes(event.documentType)
      );
    }

    // Event types
    if (localFilters.eventTypes && localFilters.eventTypes.length > 0) {
      filtered = filtered.filter(event => 
        localFilters.eventTypes!.includes(event.eventType)
      );
    }

    // Status
    if (localFilters.status && localFilters.status !== 'all') {
      filtered = filtered.filter(event => {
        if (localFilters.status === 'paid') {
          return event.status === 'completed';
        }
        if (localFilters.status === 'unpaid') {
          return event.status === 'pending';
        }
        return true;
      });
    }

    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return filtered;
  }, [events, searchQuery, localFilters]);

  // Calculate summary
  const summary = useMemo(() => {
    const incoming = filteredEvents
      .filter(e => e.direction === 'incoming')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const outgoing = filteredEvents
      .filter(e => e.direction === 'outgoing')
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const pendingIncoming = filteredEvents
      .filter(e => e.direction === 'incoming' && e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      netPosition: incoming - outgoing,
      pendingIncoming,
      currency: filteredEvents[0]?.currency || 'PLN',
      eventCount: filteredEvents.length,
    };
  }, [filteredEvents]);

  const handleFilterChange = (key: keyof LedgerFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Header with summary - only show in full view */}
      {!embedded && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Księga finansowa</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Chronologiczny zapis wszystkich zdarzeń wpływających na pieniądze
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Download className="h-4 w-4 mr-2" />
                Eksport
              </Button>
            </div>
          </div>

          {/* Summary strip - financial orientation */}
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Wpływy</div>
              <div className="text-2xl font-medium tabular-nums tracking-tight text-green-400">
                +{formatCurrency(summary.totalIncoming, summary.currency)}
              </div>
              {summary.pendingIncoming > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 px-3 py-1 text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Do wpływu: {formatCurrency(summary.pendingIncoming, summary.currency)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Koszty</div>
              <div className="text-2xl font-medium tabular-nums tracking-tight text-red-400">
                −{formatCurrency(summary.totalOutgoing, summary.currency)}
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Zysk netto</div>
              <div className={cn(
                "text-2xl font-medium tabular-nums tracking-tight",
                summary.netPosition >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {summary.netPosition >= 0 ? '+' : ''}
                {formatCurrency(summary.netPosition, summary.currency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar - lens, not navigation */}
      <div className="flex flex-wrap items-center gap-3 pb-2 border-b border-white/5">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj dokumentu, kontrahenta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Document type filter */}
        <Select
          value={localFilters.documentTypes?.[0] || 'all'}
          onValueChange={(value) => 
            handleFilterChange('documentTypes', value === 'all' ? [] : [value as DocumentType])
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Typ dokumentu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie typy</SelectItem>
            <SelectItem value="invoice">Faktury</SelectItem>
            <SelectItem value="expense">Wydatki</SelectItem>
            <SelectItem value="contract">Umowy</SelectItem>
            <SelectItem value="payment">Płatności</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={localFilters.status || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="paid">Opłacone</SelectItem>
            <SelectItem value="unpaid">Nieopłacone</SelectItem>
          </SelectContent>
        </Select>

        {!embedded && (
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Więcej filtrów
          </Button>
        )}
      </div>


      {/* Ledger timeline - grouped by date */}
      <div 
        className={cn(
          "space-y-0",
          maxHeight && "overflow-y-auto"
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {filteredEvents.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">Brak zdarzeń finansowych spełniających kryteria</p>
          </div>
        ) : (
          <div>
            {(() => {
              // Group events by date
              const grouped = filteredEvents.reduce((acc, event) => {
                const dateKey = format(new Date(event.timestamp), 'yyyy-MM-dd');
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(event);
                return acc;
              }, {} as Record<string, typeof filteredEvents>);

              return Object.entries(grouped).map(([dateKey, events]) => (
                <div key={dateKey} className="mb-6">
                  {/* Date header */}
                  <div className="px-6 py-2 text-sm font-medium text-muted-foreground">
                    {format(new Date(dateKey), 'd MMMM yyyy', { locale: pl })}
                  </div>
                  {/* Events for this date */}
                  <div className="bg-white/[0.02] border-y border-white/5">
                    {events.map((event) => (
                      <LedgerEventRow key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialLedger;
