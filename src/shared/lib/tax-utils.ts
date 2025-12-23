export const calculateIncomeTax = (netIncome: number, taxType: string | null | undefined): number | string => {
  if (netIncome <= 0) return 0;

  // **Simplified Income Tax Estimation**
  // This does NOT account for: business costs, social/health contributions,
  // tax-free amounts, tax thresholds, Ryczałt specific activity rates, etc.
  // It is a basic demonstration based only on invoice net income.

  switch (taxType) {
    case 'liniowy':
      // Simplified: 19% of net income (does not account for costs)
      return netIncome * 0.19;
    case 'ryczalt':
      // Simplified: Using a placeholder rate (e.g., 17% - varies greatly by activity)
      // Applied to net income. A real implementation uses gross revenue before costs
      // and the rate depends heavily on PKWiU code.
      return netIncome * 0.17; 
    case 'skala':
    default:
      // Skala podatkowa is complex and depends on tax thresholds, costs, etc.
      // This is a placeholder. A real app needs a detailed calculation.
      return "Do obliczenia (Skala)";
  }
}; 