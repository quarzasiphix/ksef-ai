/**
 * KSeF Token Request Builder
 * 
 * Fluent API for building KSeF token authentication requests.
 * Based on official C# AuthKsefTokenRequestBuilder pattern.
 * 
 * Provides compile-time type safety and prevents invalid request construction.
 */

import type { ContextIdentifierType, AuthorizationPolicy } from '../ksefAuthCoordinator';

export interface ContextIdentifier {
  type: ContextIdentifierType;
  value: string;
}

export interface AuthKsefTokenRequest {
  challenge: string;
  contextIdentifier: ContextIdentifier;
  encryptedToken: string;
  authorizationPolicy?: AuthorizationPolicy;
}

/**
 * Validation constants
 */
const REQUIRED_CHALLENGE_LENGTH = 64;

/**
 * Context validators
 */
const CONTEXT_VALIDATORS: Record<ContextIdentifierType, RegExp> = {
  nip: /^\d{10}$/,
  onip: /^\d{10}$/,
  pesel: /^\d{11}$/,
  krs: /^\d{10}$/
};

/**
 * IP address validators
 */
const IP_VALIDATORS = {
  ip4Address: /^(\d{1,3}\.){3}\d{1,3}$/,
  ip4Range: /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/,
  ip4Mask: /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
};

/**
 * Auth KSeF Token Request Builder
 * 
 * Usage:
 * ```typescript
 * const request = AuthKsefTokenRequestBuilder
 *   .create()
 *   .withChallenge(challenge)
 *   .withContext('nip', '1234567890')
 *   .withEncryptedToken(encryptedToken)
 *   .withAuthorizationPolicy(policy)
 *   .build();
 * ```
 */
export class AuthKsefTokenRequestBuilder {
  private challenge?: string;
  private contextIdentifier?: ContextIdentifier;
  private encryptedToken?: string;
  private authorizationPolicy?: AuthorizationPolicy;

  private constructor() {}

  /**
   * Create new builder instance
   * 
   * @returns New builder
   */
  static create(): AuthKsefTokenRequestBuilder {
    return new AuthKsefTokenRequestBuilder();
  }

  /**
   * Set challenge value
   * 
   * @param challenge - Challenge from KSeF (must be exactly 64 characters)
   * @returns Builder instance
   */
  withChallenge(challenge: string): this {
    if (!challenge || challenge.trim().length === 0) {
      throw new Error('Challenge cannot be empty');
    }

    if (challenge.length !== REQUIRED_CHALLENGE_LENGTH) {
      throw new Error(
        `Challenge must be exactly ${REQUIRED_CHALLENGE_LENGTH} characters. ` +
        `Received: ${challenge.length} characters`
      );
    }

    this.challenge = challenge;
    return this;
  }

  /**
   * Set context identifier
   * 
   * @param type - Context type (nip, pesel, krs, onip)
   * @param value - Context value
   * @returns Builder instance
   */
  withContext(type: ContextIdentifierType, value: string): this {
    this.validateContext(type, value);

    this.contextIdentifier = { type, value };
    return this;
  }

  /**
   * Set context identifier from object
   * 
   * @param contextIdentifier - Context identifier object
   * @returns Builder instance
   */
  withContextIdentifier(contextIdentifier: ContextIdentifier): this {
    this.validateContext(contextIdentifier.type, contextIdentifier.value);

    this.contextIdentifier = contextIdentifier;
    return this;
  }

  /**
   * Set encrypted token
   * 
   * @param encryptedToken - Base64-encoded encrypted token
   * @returns Builder instance
   */
  withEncryptedToken(encryptedToken: string): this {
    if (!encryptedToken || encryptedToken.trim().length === 0) {
      throw new Error('Encrypted token cannot be empty');
    }

    this.encryptedToken = encryptedToken;
    return this;
  }

  /**
   * Set authorization policy
   * 
   * @param authorizationPolicy - IP restrictions and policies
   * @returns Builder instance
   */
  withAuthorizationPolicy(authorizationPolicy: AuthorizationPolicy): this {
    if (!authorizationPolicy) {
      return this;
    }

    // Validate IP addresses if provided
    if (authorizationPolicy.allowedIps) {
      this.validateIpAddresses(authorizationPolicy.allowedIps);
    }

    this.authorizationPolicy = authorizationPolicy;
    return this;
  }

  /**
   * Build the request
   * 
   * @returns Complete auth request
   */
  build(): AuthKsefTokenRequest {
    if (!this.challenge) {
      throw new Error('Challenge is required. Call withChallenge() first.');
    }

    if (!this.contextIdentifier) {
      throw new Error('Context identifier is required. Call withContext() first.');
    }

    if (!this.encryptedToken) {
      throw new Error('Encrypted token is required. Call withEncryptedToken() first.');
    }

    return {
      challenge: this.challenge,
      contextIdentifier: this.contextIdentifier,
      encryptedToken: this.encryptedToken,
      authorizationPolicy: this.authorizationPolicy
    };
  }

  /**
   * Validate context identifier
   * 
   * @param type - Context type
   * @param value - Context value
   */
  private validateContext(type: ContextIdentifierType, value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error(`Context value cannot be empty`);
    }

    const validator = CONTEXT_VALIDATORS[type];
    if (!validator) {
      throw new Error(`Unknown context type: ${type}`);
    }

    if (!validator.test(value)) {
      throw new Error(
        `Invalid ${type.toUpperCase()}: ${value}. ` +
        `Expected format: ${validator.source}`
      );
    }
  }

  /**
   * Validate IP addresses in authorization policy
   * 
   * @param allowedIps - Allowed IPs configuration
   */
  private validateIpAddresses(allowedIps: AuthorizationPolicy['allowedIps']): void {
    if (!allowedIps) {
      return;
    }

    // Validate IP4 addresses
    if (allowedIps.ip4Addresses) {
      for (const ip of allowedIps.ip4Addresses) {
        if (!IP_VALIDATORS.ip4Address.test(ip)) {
          throw new Error(`Invalid IPv4 address: ${ip}`);
        }
      }
    }

    // Validate IP4 ranges
    if (allowedIps.ip4Ranges) {
      for (const range of allowedIps.ip4Ranges) {
        if (!IP_VALIDATORS.ip4Range.test(range)) {
          throw new Error(`Invalid IPv4 range: ${range}`);
        }
      }
    }

    // Validate IP4 masks
    if (allowedIps.ip4Masks) {
      for (const mask of allowedIps.ip4Masks) {
        if (!IP_VALIDATORS.ip4Mask.test(mask)) {
          throw new Error(`Invalid IPv4 mask: ${mask}`);
        }
      }
    }
  }
}
