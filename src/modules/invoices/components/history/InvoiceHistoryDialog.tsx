import React, { useState } from 'react';
import { X, Download, Copy, FileText, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { ProofCard, VersionTimeline, VersionPreviewDrawer, exportAuditProof, copyProofToClipboard } from './index';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceAuditTrail, InvoiceVersion } from '../../types/auditTrail';

interface InvoiceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  businessProfileId: string;
}

export const InvoiceHistoryDialog: React.FC<InvoiceHistoryDialogProps> = ({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  businessProfileId,
}) => {
  // Debug logging
  console.log('InvoiceHistoryDialog props:', { invoiceId, invoiceNumber, businessProfileId, open });
  
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'content' | 'payment' | 'accounting'>('all');
  const [showOnlyAfterIssue, setShowOnlyAfterIssue] = useState(false);

  // Fetch audit trail data
  const { data: auditTrail, isLoading, error } = useQuery<InvoiceAuditTrail>({
    queryKey: ['invoice-audit-trail', businessProfileId, invoiceId],
    queryFn: async () => {
      console.log('Fetching audit trail for invoice:', invoiceId);
      const { data, error } = await supabase.rpc('rpc_get_invoice_audit_trail', {
        p_invoice_id: invoiceId,
      });

      if (error) {
        console.error('Audit trail fetch error:', error);
        throw error;
      }
      console.log('Audit trail data received:', data);
      return data;
    },
    enabled: open && !!invoiceId && !!businessProfileId,
    staleTime: 1000 * 60 * 5, // 5 minutes - cache but refresh periodically
  });

  // Log query state
  console.log('Audit trail query state:', { isLoading, error, data: auditTrail });

  const handleExportPDF = async () => {
    if (!auditTrail) return;
    
    try {
      await exportAuditProof(auditTrail, 'pdf');
      toast.success('Dowód został wyeksportowany do PDF');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Nie udało się wyeksportować dowodu');
    }
  };

  const handleCopyProof = async () => {
    if (!auditTrail) return;
    
    try {
      await copyProofToClipboard(auditTrail);
      toast.success('Dowód skopiowany do schowka');
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('Nie udało się skopiować dowodu');
    }
  };

  const handleViewVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setShowPreview(true);
  };

  const handleCompareVersion = (versionId: string) => {
    // TODO: Implement version comparison
    toast.info('Porównywanie wersji będzie dostępne wkrótce');
  };

  const selectedVersion = auditTrail?.versions?.find(v => v.version_id === selectedVersionId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[1040px] max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 border-b border-white/5 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold">
                  Historia faktury {invoiceNumber}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-muted-foreground">
                    Invoice ID: {invoiceId.substring(0, 8)}...
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(invoiceId);
                      toast.success('ID skopiowane');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    {businessProfileId.substring(0, 8)}...
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={isLoading || !auditTrail}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Eksportuj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyProof}
                  disabled={isLoading || !auditTrail}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Skopiuj dowód
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Ładowanie historii...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="font-medium">Błąd ładowania historii</div>
                  <div className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Nieznany błąd'}
                  </div>
                </div>
              </div>
            )}

            {auditTrail && (
              <>
                {/* Proof Card - Always visible at top */}
                <ProofCard auditTrail={auditTrail} />

                {/* Timeline Filters */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={filterType === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('all')}
                    >
                      Wszystko
                    </Button>
                    <Button
                      variant={filterType === 'content' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('content')}
                    >
                      Zmiany treści
                    </Button>
                    <Button
                      variant={filterType === 'payment' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('payment')}
                    >
                      Płatności
                    </Button>
                    <Button
                      variant={filterType === 'accounting' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFilterType('accounting')}
                    >
                      Księgowość
                    </Button>
                  </div>

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyAfterIssue}
                      onChange={(e) => setShowOnlyAfterIssue(e.target.checked)}
                      className="rounded border-white/20"
                    />
                    <span>Pokaż tylko po wystawieniu</span>
                  </label>
                </div>

                {/* Version Timeline */}
                <VersionTimeline
                  versions={auditTrail.versions || []}
                  events={auditTrail.events || []}
                  filterType={filterType}
                  showOnlyAfterIssue={showOnlyAfterIssue}
                  onViewVersion={handleViewVersion}
                  onCompareVersion={handleCompareVersion}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Preview Drawer */}
      {showPreview && selectedVersion && (
        <VersionPreviewDrawer
          open={showPreview}
          onOpenChange={setShowPreview}
          version={selectedVersion}
          invoiceNumber={invoiceNumber}
        />
      )}
    </>
  );
};
