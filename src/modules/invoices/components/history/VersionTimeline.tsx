import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  CheckCircle, 
  FileText, 
  DollarSign, 
  Edit, 
  XCircle,
  AlertCircle,
  Copy,
  Eye,
  GitCompare
} from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import type { InvoiceVersion, InvoiceEvent } from '../../types/auditTrail';

interface VersionTimelineProps {
  versions: InvoiceVersion[];
  events: InvoiceEvent[];
  filterType: 'all' | 'content' | 'payment' | 'accounting';
  showOnlyAfterIssue: boolean;
  onViewVersion: (versionId: string) => void;
  onCompareVersion: (versionId: string) => void;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  events,
  filterType,
  showOnlyAfterIssue,
  onViewVersion,
  onCompareVersion,
}) => {
  // Find issued version for filtering
  const issuedVersion = versions.find(v => v.change_type === 'issued');
  const issuedDate = issuedVersion ? new Date(issuedVersion.changed_at) : null;

  // Filter versions based on criteria
  const filteredVersions = versions.filter(version => {
    // Filter by type
    if (filterType === 'content' && !['created', 'draft_saved', 'issued', 'corrected', 'modified'].includes(version.change_type)) {
      return false;
    }
    if (filterType === 'payment' && !['paid', 'unpaid'].includes(version.change_type)) {
      return false;
    }
    if (filterType === 'accounting' && !['posted', 'booked'].includes(version.change_type)) {
      return false;
    }

    // Filter by "after issue"
    if (showOnlyAfterIssue && issuedDate) {
      return new Date(version.changed_at) >= issuedDate;
    }

    return true;
  });

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return <FileText className="h-4 w-4 text-blue-400" />;
      case 'draft_saved':
        return <Edit className="h-4 w-4 text-amber-400" />;
      case 'issued':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'paid':
        return <DollarSign className="h-4 w-4 text-green-400" />;
      case 'unpaid':
        return <AlertCircle className="h-4 w-4 text-amber-400" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'corrected':
      case 'modified':
        return <Edit className="h-4 w-4 text-purple-400" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeTypeLabel = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return 'Utworzono';
      case 'draft_saved':
        return 'Zapisano wersję roboczą';
      case 'issued':
        return 'Wystawiono fakturę';
      case 'paid':
        return 'Oznaczono jako opłaconą';
      case 'unpaid':
        return 'Cofnięto płatność';
      case 'cancelled':
        return 'Anulowano';
      case 'corrected':
        return 'Skorygowano';
      case 'modified':
        return 'Zmodyfikowano';
      default:
        return changeType;
    }
  };

  const getVersionBadgeVariant = (changeType: string): 'default' | 'secondary' | 'outline' => {
    if (['issued', 'paid'].includes(changeType)) return 'default';
    if (['corrected', 'modified'].includes(changeType)) return 'secondary';
    return 'outline';
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Hash skopiowany');
  };

  if (filteredVersions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Brak wpisów spełniających kryteria filtrowania
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Historia zmian ({filteredVersions.length})
      </div>

      <div className="space-y-3">
        {filteredVersions.map((version, index) => {
          const isLocked = ['issued', 'paid'].includes(version.change_type);
          const isFirst = index === 0;
          const isLast = index === filteredVersions.length - 1;

          return (
            <div
              key={version.version_id}
              className="relative bg-white/[0.02] border border-white/5 rounded-lg p-4 hover:bg-white/[0.04] transition-colors"
            >
              {/* Timeline connector */}
              {!isLast && (
                <div className="absolute left-[30px] top-[52px] w-px h-[calc(100%+12px)] bg-white/10" />
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getChangeTypeIcon(version.change_type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {getChangeTypeLabel(version.change_type)}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(version.changed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </span>
                        {version.change_reason && (
                          <>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground italic">
                              {version.change_reason}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Version badge */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={getVersionBadgeVariant(version.change_type)} className="text-xs">
                        v{version.version_number}
                      </Badge>
                      {isLocked && (
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-400/30">
                          locked
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Hash row */}
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-black/20 px-2 py-1 rounded font-mono">
                      {version.snapshot_hash.substring(0, 16)}...
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyHash(version.snapshot_hash)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onViewVersion(version.version_id)}
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      Podgląd wersji
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onCompareVersion(version.version_id)}
                      >
                        <GitCompare className="h-3 w-3 mr-1.5" />
                        Porównaj
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => copyHash(version.snapshot_hash)}
                    >
                      <Copy className="h-3 w-3 mr-1.5" />
                      Kopiuj hash
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
