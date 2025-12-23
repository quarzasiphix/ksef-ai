import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { AlertCircle, CheckCircle2, Clock, FileText, XCircle, Download, Shield } from 'lucide-react';
import {
  addApprovalToRevocationRequest,
  rejectRevocationRequest,
  cancelRevocationRequest,
  type RevocationRequest,
} from '../data/revocationRepository';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';

interface RevocationApprovalPanelProps {
  revocationRequest: RevocationRequest;
  currentUserId: string;
  isRequiredApprover: boolean;
  canCancel: boolean;
}

export const RevocationApprovalPanel: React.FC<RevocationApprovalPanelProps> = ({
  revocationRequest,
  currentUserId,
  isRequiredApprover,
  canCancel,
}) => {
  const queryClient = useQueryClient();
  const [signature, setSignature] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const hasUserApproved = revocationRequest.approvals.some(
    (a) => a.user_id === currentUserId
  );

  const approvedCount = revocationRequest.approvals.length;
  const requiredCount = revocationRequest.required_approvers.length;

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!signature.trim()) throw new Error('Podpis jest wymagany');
      return addApprovalToRevocationRequest(revocationRequest.id, currentUserId, signature.trim());
    },
    onSuccess: () => {
      toast.success('Zatwierdzono wniosek o unieważnienie');
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      queryClient.invalidateQueries({ queryKey: ['decision', revocationRequest.decision_id] });
      queryClient.invalidateQueries({ queryKey: ['revocation-request', revocationRequest.decision_id] });
      setShowApproveDialog(false);
      setSignature('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się zatwierdzić wniosku');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return rejectRevocationRequest(revocationRequest.id, currentUserId, rejectNotes.trim());
    },
    onSuccess: () => {
      toast.success('Odrzucono wniosek o unieważnienie');
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      queryClient.invalidateQueries({ queryKey: ['decision', revocationRequest.decision_id] });
      queryClient.invalidateQueries({ queryKey: ['revocation-request', revocationRequest.decision_id] });
      setShowRejectDialog(false);
      setRejectNotes('');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się odrzucić wniosku');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return cancelRevocationRequest(revocationRequest.id, currentUserId);
    },
    onSuccess: () => {
      toast.success('Anulowano wniosek o unieważnienie');
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      queryClient.invalidateQueries({ queryKey: ['decision', revocationRequest.decision_id] });
      queryClient.invalidateQueries({ queryKey: ['revocation-request', revocationRequest.decision_id] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się anulować wniosku');
    },
  });

  const getStatusBadge = () => {
    switch (revocationRequest.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
            <Clock className="h-3 w-3 mr-1" />
            Oczekuje na dokument
          </Badge>
        );
      case 'pending_verification':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400">
            <Clock className="h-3 w-3 mr-1" />
            Weryfikacja podpisu
          </Badge>
        );
      case 'verified':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
            <Shield className="h-3 w-3 mr-1" />
            Podpis zweryfikowany
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Zatwierdzone
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="border-red-500 text-red-700 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Odrzucone
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-gray-500 text-gray-700 dark:text-gray-400">
            <XCircle className="h-3 w-3 mr-1" />
            Anulowane
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Wniosek o unieważnienie
            </CardTitle>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-3">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Powód unieważnienia</div>
              <p className="text-sm mt-1">{revocationRequest.reason}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-muted-foreground">Zgłoszono przez</div>
                <div className="mt-1">
                  {new Date(revocationRequest.requested_at).toLocaleDateString('pl-PL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="font-medium text-muted-foreground">Postęp zatwierdzeń</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${(approvedCount / requiredCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {approvedCount}/{requiredCount}
                  </span>
                </div>
              </div>
            </div>

            {revocationRequest.document_url && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">
                  Dokument uchwały uchylającej
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(revocationRequest.document_url, '_blank')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {revocationRequest.document_name || 'Pobierz dokument'}
                  <Download className="h-3 w-3 ml-2" />
                </Button>
                
                {revocationRequest.signature_verification && (
                  <div className={`p-3 rounded border ${
                    revocationRequest.signature_verification.has_signature && revocationRequest.signature_verification.crypto_valid
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {revocationRequest.signature_verification.has_signature && revocationRequest.signature_verification.crypto_valid ? (
                          <>
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900 dark:text-green-100">
                              Podpis zweryfikowany
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium text-red-900 dark:text-red-100">
                              Weryfikacja nie powiodła się
                            </span>
                          </>
                        )}
                      </div>
                      {revocationRequest.signature_verification.signer_subject && (
                        <p className="text-xs text-muted-foreground">
                          Podpisał: {revocationRequest.signature_verification.signer_subject}
                        </p>
                      )}
                      {revocationRequest.signature_verification.signing_time && (
                        <p className="text-xs text-muted-foreground">
                          Data: {new Date(revocationRequest.signature_verification.signing_time).toLocaleString('pl-PL')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Weryfikacja: integralność pliku (podpis.gov.pl)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {revocationRequest.approvals.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Zatwierdzenia</div>
                <div className="space-y-2">
                  {revocationRequest.approvals.map((approval, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{approval.signature}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(approval.approved_at).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {revocationRequest.status === 'rejected' && revocationRequest.resolution_notes && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                  Powód odrzucenia
                </div>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {revocationRequest.resolution_notes}
                </p>
              </div>
            )}
          </div>

          {(revocationRequest.status === 'verified' || revocationRequest.status === 'pending_verification') && (
            <div className="flex gap-2 flex-wrap">
              {isRequiredApprover && !hasUserApproved && (
                <>
                  <Button
                    onClick={() => setShowApproveDialog(true)}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={revocationRequest.status !== 'verified'}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Zatwierdź unieważnienie
                  </Button>
                  {revocationRequest.status === 'pending_verification' && (
                    <p className="text-xs text-amber-600">
                      Oczekiwanie na weryfikację podpisu dokumentu
                    </p>
                  )}
                  <Button onClick={() => setShowRejectDialog(true)} variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Odrzuć wniosek
                  </Button>
                </>
              )}
              {canCancel && (
                <Button onClick={() => setShowCancelDialog(true)} variant="outline">
                  Anuluj wniosek
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zatwierdź unieważnienie</AlertDialogTitle>
            <AlertDialogDescription>
              Potwierdzasz unieważnienie tej uchwały. Ta operacja jest nieodwracalna i zostanie zapisana w
              historii zdarzeń.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="signature">
              Twój podpis (imię i nazwisko) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="signature"
              placeholder="Jan Kowalski"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Podpis zostanie zapisany jako potwierdzenie Twojej zgody.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={!signature.trim() || approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Zatwierdzanie...' : 'Zatwierdź'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odrzuć wniosek o unieważnienie</AlertDialogTitle>
            <AlertDialogDescription>
              Odrzucasz wniosek o unieważnienie. Uchwała pozostanie aktywna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-notes">Powód odrzucenia (opcjonalnie)</Label>
            <Textarea
              id="reject-notes"
              placeholder="Opisz powód odrzucenia wniosku..."
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <Button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? 'Odrzucanie...' : 'Odrzuć wniosek'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anuluj wniosek</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz anulować ten wniosek o unieważnienie? Uchwała pozostanie aktywna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nie, wróć</AlertDialogCancel>
            <Button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              variant="outline"
            >
              {cancelMutation.isPending ? 'Anulowanie...' : 'Tak, anuluj'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
