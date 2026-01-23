export type KsefEnvironment = 'test' | 'production';

export type KsefStatus = 'none' | 'pending' | 'submitted' | 'error';

export interface KsefConfig {
  environment: KsefEnvironment;
  baseUrl: string;
  apiUrl: string;
  systemInfo: string;
  namespace: string;
  schemaVersion: string;
}

export interface KsefCredentials {
  businessProfileId: string;
  token: string;
  environment: KsefEnvironment;
  expiresAt?: Date;
}

export interface SessionResponse {
  sessionToken: string;
  timestamp: string;
  expiresAt?: string;
}

export interface SubmitInvoiceRequest {
  invoiceXml: string;
  businessProfileId: string;
}

export interface SubmitInvoiceResponse {
  elementReferenceNumber: string;
  processingCode: number;
  processingDescription: string;
  timestamp: string;
  upo?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

export enum KsefErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'auth_error',
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  DUPLICATE_INVOICE = 'duplicate_invoice',
  RATE_LIMIT = 'rate_limit',
  SESSION_ERROR = 'session_error',
}

export class KsefError extends Error {
  constructor(
    public type: KsefErrorType,
    public code: number,
    message: string,
    public retryable: boolean = false,
    public details?: any
  ) {
    super(message);
    this.name = 'KsefError';
  }
}

export interface KsefQueueItem {
  id: string;
  invoiceId: string;
  businessProfileId: string;
  xmlContent: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  attempts: number;
  lastAttemptAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  deadlineAt: Date;
}

export interface KsefSubmissionLog {
  id: string;
  invoiceId: string;
  businessProfileId: string;
  action: 'submit' | 'retry' | 'error' | 'success';
  statusCode?: number;
  requestXml?: string;
  responseData?: any;
  errorMessage?: string;
  createdAt: Date;
  createdBy?: string;
}
