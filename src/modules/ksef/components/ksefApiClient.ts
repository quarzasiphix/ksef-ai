import { 
  KsefConfig, 
  KsefError, 
  KsefErrorType, 
  SessionResponse, 
  SubmitInvoiceRequest, 
  SubmitInvoiceResponse 
} from './types';

export class KsefApiClient {
  private config: KsefConfig;
  private sessionToken: string | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  async initSession(token: string): Promise<SessionResponse> {
    try {
      // KSeF API v2 uses token-based authentication directly
      // No session initialization needed - token is used as Bearer token
      this.sessionToken = token;
      
      return {
        sessionToken: token,
        timestamp: new Date().toISOString(),
        expiresAt: undefined, // Token expiration is handled separately
      };
    } catch (error) {
      if (error instanceof KsefError) {
        throw error;
      }
      throw new KsefError(
        KsefErrorType.AUTHENTICATION_ERROR,
        0,
        `Failed to initialize session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  async terminateSession(): Promise<void> {
    if (!this.sessionToken) {
      return;
    }

    try {
      // In KSeF API v2, tokens don't need explicit termination
      // They expire based on their configured validity period
      console.log('Session token will expire naturally');
    } catch (error) {
      console.error('Failed to terminate session:', error);
    } finally {
      this.sessionToken = null;
    }
  }

  async submitInvoice(request: SubmitInvoiceRequest): Promise<SubmitInvoiceResponse> {
    if (!this.sessionToken) {
      throw new KsefError(
        KsefErrorType.SESSION_ERROR,
        0,
        'Session not initialized. Call initSession first.',
        false
      );
    }

    try {
      // KSeF API v2 uses interactive session for single invoice submission
      const sessionResponse = await fetch(`${this.config.baseUrl}/online/session/interactive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiationData: {
            initiationType: 'Invoice',
          },
        }),
      });

      if (!sessionResponse.ok) {
        throw await this.handleError(sessionResponse, 'Failed to create interactive session');
      }

      const sessionData = await sessionResponse.json();
      const sessionReferenceNumber = sessionData.sessionReferenceNumber;

      // Upload invoice to the session
      const uploadResponse = await fetch(`${this.config.baseUrl}/online/session/interactive/${sessionReferenceNumber}/invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'Content-Type': 'application/xml',
        },
        body: request.invoiceXml,
      });

      if (!uploadResponse.ok) {
        throw await this.handleError(uploadResponse, 'Failed to upload invoice');
      }

      // Close the session to trigger processing
      const closeResponse = await fetch(`${this.config.baseUrl}/online/session/interactive/${sessionReferenceNumber}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!closeResponse.ok) {
        throw await this.handleError(closeResponse, 'Failed to close session');
      }

      const closeData = await closeResponse.json();

      return {
        elementReferenceNumber: sessionReferenceNumber,
        processingCode: closeData.status?.code || 200,
        processingDescription: closeData.status?.description || 'Success',
        timestamp: closeData.dateUpdated || new Date().toISOString(),
        upo: closeData.upo ? JSON.stringify(closeData.upo) : undefined,
      };
    } catch (error) {
      if (error instanceof KsefError) {
        throw error;
      }
      throw new KsefError(
        KsefErrorType.NETWORK_ERROR,
        0,
        `Failed to submit invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  async getUpo(referenceNumber: string): Promise<string> {
    if (!this.sessionToken) {
      throw new KsefError(
        KsefErrorType.SESSION_ERROR,
        0,
        'Session not initialized',
        false
      );
    }

    try {
      // In KSeF API v2, UPO is retrieved from session status
      const response = await fetch(
        `${this.config.baseUrl}/online/session/interactive/${referenceNumber}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
          },
        }
      );

      if (!response.ok) {
        throw await this.handleError(response, 'Failed to retrieve session status');
      }

      const data = await response.json();
      
      if (data.upo && data.upo.pages && data.upo.pages.length > 0) {
        // Return the first page of UPO as JSON string
        return JSON.stringify(data.upo.pages[0]);
      }

      throw new Error('UPO not available');
    } catch (error) {
      if (error instanceof KsefError) {
        throw error;
      }
      throw new KsefError(
        KsefErrorType.NETWORK_ERROR,
        0,
        `Failed to get UPO: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  async checkInvoiceStatus(referenceNumber: string): Promise<any> {
    if (!this.sessionToken) {
      throw new KsefError(
        KsefErrorType.SESSION_ERROR,
        0,
        'Session not initialized',
        false
      );
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}/online/Invoice/Status/${referenceNumber}`,
        {
          headers: {
            'SessionToken': this.sessionToken,
          },
        }
      );

      if (!response.ok) {
        throw await this.handleError(response, 'Failed to check invoice status');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof KsefError) {
        throw error;
      }
      throw new KsefError(
        KsefErrorType.NETWORK_ERROR,
        0,
        `Failed to check status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        true
      );
    }
  }

  private async handleError(response: Response, defaultMessage: string): Promise<KsefError> {
    const statusCode = response.status;
    let errorMessage = defaultMessage;
    let errorType = KsefErrorType.SERVER_ERROR;
    let retryable = false;
    let details: any = null;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || defaultMessage;
      details = errorData;
    } catch {
      errorMessage = `${defaultMessage} (HTTP ${statusCode})`;
    }

    switch (statusCode) {
      case 400:
        errorType = KsefErrorType.VALIDATION_ERROR;
        retryable = false;
        break;
      case 401:
      case 403:
        errorType = KsefErrorType.AUTHENTICATION_ERROR;
        retryable = false;
        break;
      case 409:
        errorType = KsefErrorType.DUPLICATE_INVOICE;
        retryable = false;
        break;
      case 429:
        errorType = KsefErrorType.RATE_LIMIT;
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = KsefErrorType.SERVER_ERROR;
        retryable = true;
        break;
      default:
        errorType = KsefErrorType.NETWORK_ERROR;
        retryable = statusCode >= 500;
    }

    return new KsefError(errorType, statusCode, errorMessage, retryable, details);
  }

  isSessionActive(): boolean {
    return this.sessionToken !== null;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }
}
