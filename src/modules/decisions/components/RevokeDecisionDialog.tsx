import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { AlertTriangle, Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';
import {
  createRevocationRequest,
  uploadRevocationDocument,
  storeSignatureVerification,
  type CreateRevocationRequestInput,
  type SignatureVerificationData,
} from '../data/revocationRepository';
import { verifyElectronicSignature } from '@/modules/documents/data/signatureVerificationRepository';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

interface RevokeDecisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decisionId: string;
  decisionTitle: string;
  requiredApprovers: string[];
}

export const RevokeDecisionDialog: React.FC<RevokeDecisionDialogProps> = ({
  open,
  onOpenChange,
  decisionId,
  decisionTitle,
  requiredApprovers,
}) => {
  const queryClient = useQueryClient();
  const { selectedProfileId } = useBusinessProfile();
  const [step, setStep] = useState<'warning' | 'details' | 'verifying'>('warning');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [verificationResult, setVerificationResult] = useState<SignatureVerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfileId) throw new Error('Brak profilu biznesowego');
      if (!reason.trim()) throw new Error('Powód jest wymagany');
      if (!file) throw new Error('Dokument jest wymagany');
      if (confirmPhrase !== 'UNIEWAŻNIAM') throw new Error('Nieprawidłowa fraza potwierdzająca');

      // Require verified signature
      if (!verificationResult?.has_signature || !verificationResult?.crypto_valid) {
        throw new Error('Dokument musi zawierać ważny podpis elektroniczny');
      }

      // First create the revocation request
      const request = await createRevocationRequest({
        decision_id: decisionId,
        business_profile_id: selectedProfileId,
        reason: reason.trim(),
        required_approvers: requiredApprovers,
      });

      // Upload the document
      await uploadRevocationDocument(request.id, file);

      // Store verification results
      await storeSignatureVerification(request.id, verificationResult);

      return request;
    },
    onSuccess: () => {
      toast.success('Wniosek o unieważnienie został złożony z zweryfikowanym podpisem');
      queryClient.invalidateQueries({ queryKey: ['decisions'] });
      queryClient.invalidateQueries({ queryKey: ['decision', decisionId] });
      onOpenChange(false);
      setStep('warning');
      setReason('');
      setFile(null);
      setConfirmPhrase('');
      setVerificationResult(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się utworzyć wniosku o unieważnienie');
    },
  });

  const resetForm = () => {
    setReason('');
    setConfirmPhrase('');
    setFile(null);
    setStep('warning');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Dozwolone formaty: PDF, JPG, PNG');
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error('Plik jest za duży. Maksymalny rozmiar: 10MB');
        return;
      }

      setFile(selectedFile);
      setVerificationResult(null);

      // Auto-verify signature if PDF
      if (selectedFile.type === 'application/pdf') {
        await verifyFileSignature(selectedFile);
      }
    }
  };

  const verifyFileSignature = async (fileToVerify: File) => {
    setIsVerifying(true);
    try {
      const result = await verifyElectronicSignature(fileToVerify);

      const verificationData: SignatureVerificationData = {
        has_signature: result.signatures.length > 0 && result.signatures.some(s => s.status === 'VALID'),
        crypto_valid: result.signatures.some(s => s.status === 'VALID'),
        signer_subject: result.signatures[0]?.signatureData
          ? `${result.signatures[0].signatureData.firstName} ${result.signatures[0].signatureData.lastName}`
          : null,
        signing_time: result.signatures[0]?.signingTimestamp || null,
        notes: result.signatures.map(s =>
          s.status === 'VALID'
            ? `Podpis zweryfikowany: ${s.type}`
            : `Podpis nieważny lub nieznany`
        ),
        verified_at: new Date().toISOString(),
      };

      setVerificationResult(verificationData);

      if (verificationData.has_signature && verificationData.crypto_valid) {
        toast.success('Podpis zweryfikowany pomyślnie');
      } else {
        toast.warning('Nie znaleziono ważnego podpisu elektronicznego');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('Nie udało się zweryfikować podpisu');
      setVerificationResult({
        has_signature: false,
        crypto_valid: false,
        signer_subject: null,
        signing_time: null,
        notes: ['Weryfikacja nie powiodła się'],
        verified_at: new Date().toISOString(),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const isConfirmationValid = confirmPhrase === 'UNIEWAŻNIAM';
  const canProceed = reason.trim() && file && isConfirmationValid;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        {step === 'warning' && (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <AlertDialogTitle className="text-xl">
                  Unieważnienie uchwały
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base space-y-4 pt-4">
                <p className="font-semibold text-foreground">
                  Zamierzasz unieważnić uchwałę: <span className="text-red-600">"{decisionTitle}"</span>
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    ⚠️ Ważne informacje:
                  </p>
                  <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">•</span>
                      <span>
                        <strong>Ta operacja jest audytowana i zapisana w historii zdarzeń.</strong> Każda próba unieważnienia jest rejestrowana wraz z pełnym kontekstem.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">•</span>
                      <span>
                        <strong>Uchwała nie znika z systemu</strong> — zostaje oznaczona jako wycofywana/unieważniona i pozostaje w bazie danych na stałe.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">•</span>
                      <span>
                        <strong>Do skutecznego unieważnienia wymagane są zgody wspólników oraz dokument revokacji.</strong> Proces wymaga zatwierdzenia przez wszystkich wymaganych wspólników.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>Wymagani zatwierdzający:</strong> {requiredApprovers.length} wspólnik(ów)
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Po utworzeniu wniosku, każdy z wymaganych wspólników będzie musiał zatwierdzić unieważnienie.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={resetForm}>Anuluj</AlertDialogCancel>
              <Button
                onClick={() => setStep('details')}
                variant="destructive"
              >
                Kontynuuj
              </Button>
            </AlertDialogFooter>
          </>
        )}

        {step === 'details' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Szczegóły unieważnienia</AlertDialogTitle>
              <AlertDialogDescription>
                Wypełnij wymagane informacje, aby utworzyć wniosek o unieważnienie.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Powód unieważnienia <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Opisz szczegółowo powód unieważnienia tej uchwały..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Powód będzie widoczny dla wszystkich wspólników i zapisany w historii.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">
                  Podpisany dokument uchwały uchylającej <span className="text-red-600">*</span>
                </Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {file ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFile(null);
                            setVerificationResult(null);
                          }}
                        >
                          Usuń
                        </Button>
                      </div>

                      {isVerifying && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            <span className="text-blue-900 dark:text-blue-100">Weryfikacja podpisu...</span>
                          </div>
                        </div>
                      )}

                      {verificationResult && (
                        <div className={`p-3 rounded border ${
                          verificationResult.has_signature && verificationResult.crypto_valid
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {verificationResult.has_signature && verificationResult.crypto_valid ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                                    Podpis zweryfikowany
                                  </span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                    Brak ważnego podpisu
                                  </span>
                                </>
                              )}
                            </div>
                            {verificationResult.signer_subject && (
                              <p className="text-xs text-muted-foreground">
                                Podpisał: {verificationResult.signer_subject}
                              </p>
                            )}
                            {verificationResult.signing_time && (
                              <p className="text-xs text-muted-foreground">
                                Data: {new Date(verificationResult.signing_time).toLocaleString('pl-PL')}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Weryfikacja: integralność pliku (podpis.gov.pl)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <Label
                        htmlFor="document"
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-700"
                      >
                        Wybierz podpisany plik
                      </Label>
                      <Input
                        id="document"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF z podpisem elektronicznym (max 10MB)
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Wymagany dokument z ważnym podpisem elektronicznym wspólników
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation">
                  Potwierdzenie <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="confirmation"
                  placeholder='Wpisz "UNIEWAŻNIAM" aby potwierdzić'
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value.toUpperCase())}
                  className={confirmPhrase && !isConfirmationValid ? 'border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">
                  Wpisz dokładnie "UNIEWAŻNIAM" (wielkimi literami), aby potwierdzić operację.
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setStep('warning')}>
                Wstecz
              </AlertDialogCancel>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={
                  createMutation.isPending ||
                  !reason.trim() ||
                  !file ||
                  confirmPhrase !== 'UNIEWAŻNIAM' ||
                  !verificationResult?.has_signature ||
                  !verificationResult?.crypto_valid ||
                  isVerifying
                }
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {createMutation.isPending ? 'Składanie wniosku...' : 'Złóż wniosek o unieważnienie'}
              </Button>
              {file && (!verificationResult?.has_signature || !verificationResult?.crypto_valid) && !isVerifying && (
                <p className="text-xs text-red-600 text-center">
                  Dokument musi zawierać ważny podpis elektroniczny
                </p>
              )}
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};
