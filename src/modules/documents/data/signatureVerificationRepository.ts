/**
 * Polish Government Digital Signature Verification
 * Uses podpis.gov.pl API to verify electronic signatures on documents
 */

export interface SignatureVerificationResult {
  status: 'VALID' | 'INVALID' | 'UNKNOWN';
  signatureData?: {
    pesel: string;
    firstName: string;
    lastName: string;
  };
  type?: 'TRUSTED' | 'QUALIFIED' | 'ADVANCED';
  signingTimestamp?: string;
}

export interface DocumentVerificationResponse {
  signatures: SignatureVerificationResult[];
  documentId: string;
  requestId: string;
}

const PODPIS_API_BASE = 'https://podpis.gov.pl/api/b4ds/document-signer';

/**
 * Generate a unique request ID for the verification session
 */
function generateRequestId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique document ID
 */
function generateDocumentId(): string {
  return Date.now().toString();
}

/**
 * Upload document to podpis.gov.pl for signature verification
 */
async function uploadDocumentForVerification(
  file: File,
  requestId: string,
  documentId: string
): Promise<{ compressedContent: boolean; embeddedContent: boolean; flattenedContent: boolean }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', file.name);
  formData.append('documentId', documentId);
  formData.append('requestId', requestId);

  const response = await fetch(`${PODPIS_API_BASE}/add-document`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload document: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Verify signatures on the uploaded document
 */
async function verifyDocumentSignatures(
  requestId: string,
  documentId: string
): Promise<SignatureVerificationResult[]> {
  const response = await fetch(
    `${PODPIS_API_BASE}/unsigned-verification/signRequest/${requestId}/document/${documentId}`,
    {
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to verify signatures: ${response.statusText}`);
  }

  const data = await response.json();
  
  // API returns either a single object or an array
  if (Array.isArray(data)) {
    return data;
  }
  
  return [data];
}

/**
 * Main function: Verify electronic signatures on a document
 * 
 * @param file - The file to verify (PDF, XML, or other signed document)
 * @returns Verification results including signer information
 */
export async function verifyElectronicSignature(
  file: File
): Promise<DocumentVerificationResponse> {
  const requestId = generateRequestId();
  const documentId = generateDocumentId();

  // Step 1: Upload document
  await uploadDocumentForVerification(file, requestId, documentId);

  // Step 2: Verify signatures
  const signatures = await verifyDocumentSignatures(requestId, documentId);

  return {
    signatures,
    documentId,
    requestId,
  };
}

/**
 * Check if a file has valid Polish government signatures
 */
export async function hasValidGovernmentSignature(file: File): Promise<boolean> {
  try {
    const result = await verifyElectronicSignature(file);
    return result.signatures.some((sig) => sig.status === 'VALID');
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Extract all signers from a document
 */
export async function extractSigners(file: File): Promise<Array<{
  name: string;
  pesel: string;
  timestamp: string;
  type: string;
  valid: boolean;
}>> {
  try {
    const result = await verifyElectronicSignature(file);
    
    return result.signatures
      .filter((sig) => sig.signatureData)
      .map((sig) => ({
        name: `${sig.signatureData!.firstName} ${sig.signatureData!.lastName}`,
        pesel: sig.signatureData!.pesel,
        timestamp: sig.signingTimestamp || '',
        type: sig.type || 'UNKNOWN',
        valid: sig.status === 'VALID',
      }));
  } catch (error) {
    console.error('Error extracting signers:', error);
    return [];
  }
}
