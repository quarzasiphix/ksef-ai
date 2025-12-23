// A/B test variant assignment logic
// Uses deterministic hashing for consistent variant assignment

/**
 * Simple string hash function for consistent bucketing
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Assign variant based on session ID and test ID
 * Uses deterministic hashing to ensure same user always gets same variant
 */
export const assignVariant = (
  sessionId: string,
  testId: string,
  variants: string[],
  weights?: number[]
): string => {
  // Use default equal weights if not provided
  const variantWeights = weights || variants.map(() => 100 / variants.length);
  
  // Validate weights
  if (variantWeights.length !== variants.length) {
    console.error('Variant weights length must match variants length');
    return variants[0];
  }
  
  const totalWeight = variantWeights.reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    console.error('Variant weights must sum to 100');
    return variants[0];
  }
  
  // Generate hash from session + test ID
  const hash = hashString(`${sessionId}-${testId}`);
  const bucket = hash % 100;
  
  // Assign variant based on bucket and weights
  let cumulativeWeight = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulativeWeight += variantWeights[i];
    if (bucket < cumulativeWeight) {
      return variants[i];
    }
  }
  
  // Fallback to first variant
  return variants[0];
};

/**
 * Get stored variant from localStorage
 */
export const getStoredVariant = (testId: string): string | null => {
  try {
    return localStorage.getItem(`ab_test_${testId}`);
  } catch (error) {
    console.error('Failed to get stored variant:', error);
    return null;
  }
};

/**
 * Store variant in localStorage
 */
export const storeVariant = (testId: string, variant: string): void => {
  try {
    localStorage.setItem(`ab_test_${testId}`, variant);
  } catch (error) {
    console.error('Failed to store variant:', error);
  }
};

/**
 * Clear all stored variants (useful for testing)
 */
export const clearAllVariants = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('ab_test_')) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear variants:', error);
  }
};
