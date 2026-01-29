/**
 * KSEF Test Token Generator
 * 
 * Generates test KSEF tokens for development/testing
 */

import { KsefConfig } from './types';

export class KsefTestTokenGenerator {
  private config: KsefConfig;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Generate a test KSEF token for development
   * This creates a token that follows the KSEF 2.0 format
   */
  generateTestToken(): string {
    // Generate a token that follows KSEF 2.0 format
    // Based on the Java examples, tokens should be in a specific format
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15).toUpperCase();
    
    // Format: YYYYMMDD-XX-XXXXXXXXXX-XXXXXXXXXX-XX
    const token = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-TK-${randomId.substring(0, 8)}-${randomId.substring(8, 16)}-${randomId.substring(16, 18).toUpperCase()}`;
    
    console.log('🔑 Generated test KSEF token:', token);
    return token;
  }

  /**
   * Generate a simple test token that should work with KSEF
   */
  generateSimpleTestToken(): string {
    // Try a very simple format that KSEF might accept
    const token = `TEST-${Date.now()}`;
    console.log('🔑 Generated simple test token:', token);
    return token;
  }

  /**
   * Generate a token that matches the format from the database
   */
  generateDatabaseFormatToken(): string {
    // Generate a token in the same format as the one in the database
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase();
    
    const token = `${dateStr}-TK-${randomPart.substring(0, 8)}-${randomPart.substring(8, 16)}-${randomPart.substring(16, 18).toUpperCase()}`;
    console.log('🔑 Generated database format token:', token);
    return token;
  }
}
