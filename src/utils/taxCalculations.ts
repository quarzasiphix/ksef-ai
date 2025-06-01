import { BusinessProfile, Invoice, Expense } from "@/types";

// Define interfaces for tax rules
interface TaxScaleRules {
  taxFreeAmount: number;
  thresholds: { amount: number; rate: number }[];
  taxReducingAmount: number;
}

interface FlatTaxRules {
  rate: number;
  healthContributionAnnualLimit: number; // Annual limit for health contribution deduction
}

interface RyczaltTaxRules {
  rates: { activityType: string; rate: number }[]; // Requires detailed rates based on business activity (PKWiU)
  // Note: Ryczalt is based on revenue, not income (expenses are generally not deductible).
  // Healthcare contributions are partially deductible (50%).
}

// Current Polish income tax rules (as of 2024/2025) - Placeholder rates for Ryczalt
const TAX_RULES = {
  skala: {
    taxFreeAmount: 30000, // Kwota wolna od podatku
    thresholds: [
      { amount: 120000, rate: 0.12 }, // First bracket
      { amount: Infinity, rate: 0.32 }, // Second bracket (excess over 120,000)
    ],
    taxReducingAmount: 3600, // Kwota zmniejszająca podatek (12% of 30,000)
  } as TaxScaleRules,
  liniowy: {
    rate: 0.19, // Fixed 19% rate
    healthContributionAnnualLimit: 11600, // 2024 limit (example) - needs to be dynamic/updated
    // Note: Social security contributions are deductible from income. Health contributions are deductible up to the annual limit.
  } as FlatTaxRules,
  ryczalt: {
    rates: [], // Placeholder - Needs actual PKWiU-based rates
    // Note: Social security contributions and 50% of health contributions are deductible from revenue.
  } as RyczaltTaxRules,
};

// Function to calculate estimated income tax for a given period
export const calculateIncomeTax = (
  taxType: BusinessProfile['tax_type'],
  totalIncome: number, // Total income for the period
  totalExpenses: number, // Total deductible expenses for the period (excluding ZUS initially)
  socialSecurityContributions: number, // Social security contributions paid in the period (deductible from income/revenue)
  healthInsuranceContributions: number, // Health insurance contributions paid in the period (partially deductible)
  // Note: This calculation is for a period (e.g., month/quarter).
  // Annual calculation for filing might involve summing periods and considering annual limits/deductions (like full ZUS, annual thresholds).
  // Solidarity tax (4% over 1M PLN annual income) is not included here.
): number => {
  let estimatedTax = 0;

  switch (taxType) {
    case 'skala':
      // Skala: Income - Deductible Expenses - Social Security - Health Insurance
      const taxableIncomeSkala = totalIncome - totalExpenses - socialSecurityContributions - healthInsuranceContributions;
      const incomeMinusExpensesSkala = Math.max(0, taxableIncomeSkala); // Cannot have negative taxable income
      
      if (incomeMinusExpensesSkala <= TAX_RULES.skala.taxFreeAmount) {
          estimatedTax = 0; // Income within tax-free amount
      } else if (incomeMinusExpensesSkala <= TAX_RULES.skala.thresholds[0].amount) {
          // First bracket: 12% minus tax reducing amount
          estimatedTax = (incomeMinusExpensesSkala * TAX_RULES.skala.thresholds[0].rate) - TAX_RULES.skala.taxReducingAmount;
      } else {
          // Second bracket: Tax for first bracket + 32% on excess
          const taxInFirstBracket = (TAX_RULES.skala.thresholds[0].amount * TAX_RULES.skala.thresholds[0].rate) - TAX_RULES.skala.taxReducingAmount;
          const excessIncome = incomeMinusExpensesSkala - TAX_RULES.skala.thresholds[0].amount;
          const taxInSecondBracket = excessIncome * TAX_RULES.skala.thresholds[1].rate;
          estimatedTax = taxInFirstBracket + taxInSecondBracket;
      }
      
      break;

    case 'liniowy':
      // Liniowy: Income - Deductible Expenses - Social Security - Deductible Health Insurance (up to limit)
      // For simplicity here, let's assume the health contribution for the *period* is within the prorated annual limit.
      // A more accurate calculation would track the total health contributions paid annually.
      const deductibleHealthLiniowy = Math.min(healthInsuranceContributions, TAX_RULES.liniowy.healthContributionAnnualLimit / 12); // Simplified per-month limit
      const taxableAmountLiniowy = Math.max(0, totalIncome - totalExpenses - socialSecurityContributions - deductibleHealthLiniowy);
      estimatedTax = taxableAmountLiniowy * TAX_RULES.liniowy.rate;
      break;

    case 'ryczalt':
      // Ryczalt: Revenue - Social Security - 50% Health Insurance (simplified)
      // This is a simplified placeholder. A proper implementation needs activity-based rates and calculation on revenue.
      // Expenses are generally NOT deductible, only specific contributions.
      const ryczaltRatePlaceholder = 0.17; // Example placeholder rate - NEEDS TO BE DYNAMIC AND ACTIVITY BASED
      const deductibleHealthRyczalt = healthInsuranceContributions * 0.5; // 50% deductible health insurance
      // Assuming totalIncome represents revenue for simplicity in this placeholder:
      const taxableRevenueRyczalt = Math.max(0, totalIncome - socialSecurityContributions - deductibleHealthRyczalt);
      estimatedTax = taxableRevenueRyczalt * ryczaltRatePlaceholder;
      console.warn("Ryczalt tax calculation is a simplified placeholder and requires activity-based rates and calculation on revenue.");
      break;

    default:
      estimatedTax = 0;
      console.warn(`Unknown or undefined tax type: ${taxType}. Cannot calculate estimated tax.`);
  }

  // Ensure tax is not negative
  return Math.max(0, estimatedTax);
}; 