import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent } from '@/shared/ui/card';
import { Upload, FileCheck, CheckCircle2, XCircle, AlertCircle, Shield, User, Calendar } from 'lucide-react';
import {
  verifyElectronicSignature,
  type SignatureVerificationResult,
} from '../data/signatureVerificationRepository';

interface SignatureVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: (signers: SignatureVerificationResult[]) => void;
}

export const SignatureVerificationDialog: React.FC<SignatureVerificationDialogProps> = ({
  open,
  onOpenChange,
  onVerified,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<SignatureVerificationResult[] | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (fileToVerify: File) => {
      const result = await verifyElectronicSignature(fileToVerify);
      return result.signatures;
    },
    onSuccess: (signatures) => {
      setVerificationResult(signatures);
      const validCount = signatures.filter((s) => s.status === 'VALID').length;
      if (validCount > 0) {
        toast.success(`Zweryfikowano ${validCount} ważny(ch) podpis(ów)`);
        onVerified?.(signatures);
      } else {
        toast.warning('Nie znaleziono ważnych podpisów elektronicznych');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się zweryfikować podpisu');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVerificationResult(null);
    }
  };

  const handleVerify = () => {
    if (!file) {
      toast.error('Wybierz plik do weryfikacji');
      return;
    }
    verifyMutation.mutate(file);
  };

  const handleReset = () => {
    setFile(null);
    setVerificationResult(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VALID':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ważny
          </Badge>
        );
      case 'INVALID':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Nieważny
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            Nieznany
          </Badge>
        );
    }
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'TRUSTED':
        return <Badge variant="outline">Zaufany</Badge>;
      case 'QUALIFIED':
        return <Badge variant="outline">Kwalifikowany</Badge>;
      case 'ADVANCED':
        return <Badge variant="outline">Zaawansowany</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle>Weryfikacja podpisu elektronicznego</DialogTitle>
              <DialogDescription>
                Sprawdź autentyczność podpisu elektronicznego za pomocą podpis.gov.pl
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">Wybierz podpisany dokument</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileCheck className="h-8 w-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                  >
                    Usuń
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <Label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-700"
                  >
                    Wybierz plik
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.xml,.p7s,.sig"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, XML lub inne dokumenty z podpisem elektronicznym
                  </p>
                </div>
              )}
            </div>
          </div>

          {file && !verificationResult && (
            <Button
              onClick={handleVerify}
              disabled={verifyMutation.isPending}
              className="w-full"
            >
              {verifyMutation.isPending ? 'Weryfikacja...' : 'Zweryfikuj podpis'}
            </Button>
          )}

          {verificationResult && verificationResult.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Wyniki weryfikacji</h3>
                <Badge variant="outline">
                  {verificationResult.length} podpis(ów)
                </Badge>
              </div>

              <div className="space-y-3">
                {verificationResult.map((signature, index) => (
                  <Card key={index} className={signature.status === 'VALID' ? 'border-green-200 dark:border-green-800' : ''}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(signature.status)}
                            {getTypeBadge(signature.type)}
                          </div>
                        </div>

                        {signature.signatureData && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {signature.signatureData.firstName} {signature.signatureData.lastName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>PESEL:</span>
                              <code className="px-2 py-0.5 bg-muted rounded text-xs">
                                {signature.signatureData.pesel}
                              </code>
                            </div>
                            {signature.signingTimestamp && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {new Date(signature.signingTimestamp).toLocaleString('pl-PL', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {signature.status === 'VALID' && (
                          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-200">
                            ✓ Podpis został zweryfikowany przez podpis.gov.pl
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Sprawdź inny dokument
                </Button>
                <Button onClick={() => onOpenChange(false)} className="flex-1">
                  Zamknij
                </Button>
              </div>
            </div>
          )}

          {verificationResult && verificationResult.length === 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Nie znaleziono podpisów
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Ten dokument nie zawiera podpisów elektronicznych lub nie mogą być zweryfikowane.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
