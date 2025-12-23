import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  verifyElectronicSignature,
  hasValidGovernmentSignature,
  extractSigners,
  type SignatureVerificationResult,
} from '../data/signatureVerificationRepository';

export interface SignerInfo {
  name: string;
  pesel: string;
  timestamp: string;
  type: string;
  valid: boolean;
}

export function useSignatureVerification() {
  const [verificationResult, setVerificationResult] = useState<SignatureVerificationResult[] | null>(null);
  const [signers, setSigners] = useState<SignerInfo[]>([]);

  const verifyMutation = useMutation({
    mutationFn: async (file: File) => {
      const result = await verifyElectronicSignature(file);
      return result.signatures;
    },
    onSuccess: (signatures) => {
      setVerificationResult(signatures);
      const validCount = signatures.filter((s) => s.status === 'VALID').length;
      if (validCount > 0) {
        toast.success(`Zweryfikowano ${validCount} ważny(ch) podpis(ów)`);
      } else {
        toast.warning('Nie znaleziono ważnych podpisów elektronicznych');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się zweryfikować podpisu');
      setVerificationResult(null);
    },
  });

  const checkValidSignature = useMutation({
    mutationFn: async (file: File) => {
      return hasValidGovernmentSignature(file);
    },
  });

  const extractSignersMutation = useMutation({
    mutationFn: async (file: File) => {
      const extractedSigners = await extractSigners(file);
      setSigners(extractedSigners);
      return extractedSigners;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Nie udało się wyodrębnić podpisujących');
      setSigners([]);
    },
  });

  const reset = () => {
    setVerificationResult(null);
    setSigners([]);
  };

  return {
    verificationResult,
    signers,
    verify: verifyMutation.mutate,
    checkValid: checkValidSignature.mutate,
    extractSigners: extractSignersMutation.mutate,
    isVerifying: verifyMutation.isPending || checkValidSignature.isPending || extractSignersMutation.isPending,
    reset,
  };
}
