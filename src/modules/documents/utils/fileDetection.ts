/**
 * File detection utilities for smart tag suggestions and type detection
 */

export interface FileDetectionResult {
  fileType: 'pdf' | 'image' | 'document' | 'spreadsheet' | 'other';
  suggestedTags: string[];
}

/**
 * Detect file type from MIME type and extension
 */
export const detectFileType = (file: File): 'pdf' | 'image' | 'document' | 'spreadsheet' | 'other' => {
  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return 'image';
  }

  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    ['doc', 'docx', 'odt', 'txt', 'rtf'].includes(extension)
  ) {
    return 'document';
  }

  if (
    mimeType.includes('sheet') ||
    mimeType.includes('excel') ||
    ['xls', 'xlsx', 'ods', 'csv'].includes(extension)
  ) {
    return 'spreadsheet';
  }

  return 'other';
};

/**
 * Suggest tags based on filename keywords
 * Returns Polish tags for common document types
 */
export const suggestTags = (filename: string): string[] => {
  const lowerName = filename.toLowerCase();
  const suggestions: string[] = [];

  // Business registry keywords
  if (lowerName.includes('krs')) suggestions.push('krs');
  if (lowerName.includes('ceidg')) suggestions.push('ceidg');
  if (lowerName.includes('nip')) suggestions.push('nip');
  if (lowerName.includes('regon')) suggestions.push('regon');

  // Decision keywords
  if (lowerName.includes('uchwala') || lowerName.includes('uchwała')) suggestions.push('uchwała');
  if (lowerName.includes('decyzja')) suggestions.push('decyzja');
  if (lowerName.includes('protokol') || lowerName.includes('protokół')) suggestions.push('protokół');
  if (lowerName.includes('oswiadczenie') || lowerName.includes('oświadczenie')) suggestions.push('oświadczenie');

  // Financial keywords
  if (lowerName.includes('faktura')) suggestions.push('faktura');
  if (lowerName.includes('kosztorys')) suggestions.push('kosztorys');
  if (lowerName.includes('rachunek')) suggestions.push('rachunek');
  if (lowerName.includes('paragon')) suggestions.push('paragon');
  if (lowerName.includes('wyciag') || lowerName.includes('wyciąg')) suggestions.push('wyciąg');

  // Contract keywords
  if (lowerName.includes('umowa')) suggestions.push('umowa');
  if (lowerName.includes('aneks')) suggestions.push('aneks');
  if (lowerName.includes('zalacznik') || lowerName.includes('załącznik')) suggestions.push('załącznik');

  // Operational keywords
  if (lowerName.includes('zlecenie')) suggestions.push('zlecenie');
  if (lowerName.includes('cmr')) suggestions.push('cmr');
  if (lowerName.includes('dostawa')) suggestions.push('dostawa');
  if (lowerName.includes('transport')) suggestions.push('transport');

  // Capital keywords
  if (lowerName.includes('kapital') || lowerName.includes('kapitał')) suggestions.push('kapitał');
  if (lowerName.includes('wklad') || lowerName.includes('wkład')) suggestions.push('wkład');
  if (lowerName.includes('przelew')) suggestions.push('przelew');

  // Correspondence keywords
  if (lowerName.includes('korespondencja')) suggestions.push('korespondencja');
  if (lowerName.includes('pismo')) suggestions.push('pismo');
  if (lowerName.includes('wniose') || lowerName.includes('wniosek')) suggestions.push('wniosek');

  // Year detection
  const yearMatch = lowerName.match(/20\d{2}/);
  if (yearMatch) suggestions.push(yearMatch[0]);

  return [...new Set(suggestions)]; // Remove duplicates
};

/**
 * Detect file and suggest tags
 */
export const analyzeFile = (file: File): FileDetectionResult => {
  return {
    fileType: detectFileType(file),
    suggestedTags: suggestTags(file.name),
  };
};
