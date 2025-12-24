/**
 * JPK_V7M Version 3 - Main Entry Point
 * 
 * Orchestrates the complete JPK_V7M generation pipeline:
 * 1. Map accounting model to JPK structure
 * 2. Generate XML
 * 3. Validate (structure + business rules)
 */

import { JpkGenerationRequest, JpkGenerationResult } from '../../types/accounting-model';
import { mapToJpkV7M } from './mapper';
import { generateValidatedXml } from './generator';
import { validateJpkV7M } from './validator';

/**
 * Generate JPK_V7M file from accounting data
 * 
 * @param request - Generation request with accounting model data
 * @returns Generation result with XML or errors
 */
export async function generateJpkV7M(request: JpkGenerationRequest): Promise<JpkGenerationResult> {
  try {
    // Step 1: Map accounting model to JPK structure
    const jpkStructure = mapToJpkV7M(request);
    
    // Step 2: Validate structure and business rules
    const validationResult = validateJpkV7M(jpkStructure);
    
    if (!validationResult.isValid) {
      return {
        success: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        generatedAt: new Date().toISOString(),
        fileSize: 0,
        entryCount: 0,
      };
    }
    
    // Step 3: Generate XML
    const xml = generateValidatedXml(jpkStructure);
    
    // Count entries
    const salesCount = jpkStructure.JPK.PozycjeSzczegolowe?.SprzedazWiersz?.length || 0;
    const purchaseCount = jpkStructure.JPK.PozycjeSzczegolowe?.ZakupWiersz?.length || 0;
    const entryCount = salesCount + purchaseCount;
    
    return {
      success: true,
      xml,
      errors: [],
      warnings: validationResult.warnings,
      generatedAt: new Date().toISOString(),
      fileSize: Buffer.byteLength(xml, 'utf8'),
      entryCount,
    };
  } catch (error) {
    return {
      success: false,
      errors: [{
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error during JPK generation',
        severity: 'error',
      }],
      warnings: [],
      generatedAt: new Date().toISOString(),
      fileSize: 0,
      entryCount: 0,
    };
  }
}

/**
 * Export all components for advanced usage
 */
export { mapToJpkV7M } from './mapper';
export { generateValidatedXml } from './generator';
export { validateJpkV7M } from './validator';
export * from './types';
