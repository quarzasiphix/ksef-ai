import { generateInvoiceNumber } from '../invoice-utils';

describe('generateInvoiceNumber', () => {
  const testDate = new Date('2025-07-30T12:00:00+02:00');
  
  it('generates incremental invoice numbers correctly', () => {
    const result = generateInvoiceNumber(testDate, 1, 'FV', 'incremental');
    expect(result).toBe('FV/001');
    
    const result2 = generateInvoiceNumber(testDate, 15, 'INV', 'incremental');
    expect(result2).toBe('INV/015');
  });
  
  it('generates yearly invoice numbers correctly', () => {
    const result = generateInvoiceNumber(testDate, 1, 'FV', 'yearly');
    expect(result).toBe('FV/2025/001');
    
    const result2 = generateInvoiceNumber(testDate, 15, 'INV', 'yearly');
    expect(result2).toBe('INV/2025/015');
  });
  
  it('generates monthly invoice numbers correctly', () => {
    const result = generateInvoiceNumber(testDate, 1, 'FV', 'monthly');
    expect(result).toBe('FV/2025/07/001');
    
    const result2 = generateInvoiceNumber(testDate, 15, 'INV', 'monthly');
    expect(result2).toBe('INV/2025/07/015');
  });
  
  it('handles different prefixes', () => {
    const result1 = generateInvoiceNumber(testDate, 1, 'INV', 'incremental');
    expect(result1).toBe('INV/001');
    
    const result2 = generateInvoiceNumber(testDate, 1, 'PROF', 'incremental');
    expect(result2).toBe('PROF/001');
  });
  
  it('pads sequence numbers correctly', () => {
    const result1 = generateInvoiceNumber(testDate, 1, 'FV', 'incremental');
    expect(result1).toBe('FV/001');
    
    const result2 = generateInvoiceNumber(testDate, 15, 'FV', 'incremental');
    expect(result2).toBe('FV/015');
    
    const result3 = generateInvoiceNumber(testDate, 150, 'FV', 'incremental');
    expect(result3).toBe('FV/150');
  });
});
