import React, { useState } from 'react';
import { FileText, Upload, Trash2, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { useAttachments, useDeleteAttachment } from '@/shared/hooks/useAttachments';
import { ATTACHMENT_ROLE_LABELS, type DecisionAttachmentRole } from '@/shared/types/attachment';
import { formatFileSize } from '@/modules/documents/types/storage';
import { StorageService } from '@/shared/services/storageService';
import { cn } from '@/shared/lib/utils';

interface DecisionEvidenceProps {
  decisionId: string;
  decisionStatus: string;
  onAddAttachment: () => void;
  onViewFile?: (fileId: string) => void;
}

export const DecisionEvidence: React.FC<DecisionEvidenceProps> = ({
  decisionId,
  decisionStatus,
  onAddAttachment,
  onViewFile,
}) => {
  const { data: attachments = [], isLoading } = useAttachments('decision', decisionId);
  const deleteAttachment = useDeleteAttachment();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Check for signed PDF (audit-critical)
  const hasSignedPDF = attachments.some(att => att.role === 'DECISION_SIGNED_PDF');
  const isApproved = decisionStatus === 'ZATWIERDZONA' || decisionStatus === 'APPROVED';
  const needsSignedPDF = isApproved && !hasSignedPDF;

  // Group attachments by role
  const draftPDF = attachments.find(att => att.role === 'DECISION_DRAFT_PDF');
  const signedPDF = attachments.find(att => att.role === 'DECISION_SIGNED_PDF');
  const scans = attachments.filter(att => att.role === 'DECISION_SCAN');
  const supporting = attachments.filter(att => att.role === 'DECISION_SUPPORTING_DOC');

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten załącznik?')) return;
    
    setDeletingId(attachmentId);
    try {
      await deleteAttachment.mutateAsync({
        id: attachmentId,
        entityType: 'decision',
        entityId: decisionId,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewFile = async (fileId: string) => {
    if (onViewFile) {
      onViewFile(fileId);
    } else {
      // Fallback: open in new tab
      try {
        const url = await StorageService.getFileViewUrl(fileId);
        window.open(url, '_blank');
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const renderAttachment = (attachment: typeof attachments[0]) => (
    <div
      key={attachment.id}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-card',
        deletingId === attachment.id && 'opacity-50'
      )}
    >
      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.file_name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString('pl-PL')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewFile(attachment.storage_file_id)}
          disabled={deletingId === attachment.id}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(attachment.id)}
          disabled={deletingId === attachment.id}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center text-sm text-muted-foreground">Ładowanie załączników...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Dowody decyzji</h3>
          <p className="text-sm text-muted-foreground">
            Dokumenty potwierdzające autoryzację i wykonanie decyzji
          </p>
        </div>
        <Button onClick={onAddAttachment} size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Dodaj
        </Button>
      </div>

      {/* Audit warning */}
      {needsSignedPDF && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Brak podpisanego dokumentu decyzji. Decyzja nie jest gotowa do audytu.
          </AlertDescription>
        </Alert>
      )}

      {/* Audit ready badge */}
      {hasSignedPDF && isApproved && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Decyzja gotowa do audytu - posiada podpisany dokument
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Draft PDF */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">Projekt decyzji (PDF)</h4>
            <Badge variant="secondary" className="text-xs">Opcjonalny</Badge>
          </div>
          {draftPDF ? (
            renderAttachment(draftPDF)
          ) : (
            <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
              Brak projektu decyzji
            </div>
          )}
        </div>

        {/* Signed PDF - CRITICAL */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-sm font-semibold">Podpisana decyzja (PDF)</h4>
            <Badge variant="default" className="text-xs bg-red-600">Wymagany do audytu</Badge>
          </div>
          {signedPDF ? (
            renderAttachment(signedPDF)
          ) : (
            <div className="p-4 border border-dashed border-red-300 rounded-lg bg-red-50">
              <div className="flex items-center justify-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Brak podpisanego dokumentu</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onAddAttachment}
                className="mt-2 w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Dodaj podpisaną decyzję
              </Button>
            </div>
          )}
        </div>

        {/* Scans */}
        {scans.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Skany</h4>
            <div className="space-y-2">
              {scans.map(renderAttachment)}
            </div>
          </div>
        )}

        {/* Supporting documents */}
        {supporting.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Inne załączniki</h4>
            <div className="space-y-2">
              {supporting.map(renderAttachment)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {attachments.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Brak załączników dla tej decyzji
            </p>
            <Button onClick={onAddAttachment} variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Dodaj pierwszy załącznik
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
