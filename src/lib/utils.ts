import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values consistently across the app.
 * Defaults to PLN and Polish locale, but can be overridden per use-case.
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: Intl.NumberFormatOptions & { currency?: string } = {}
): string {
  const safeAmount = typeof amount === "number" ? amount : 0;
  const { currency = "PLN", ...rest } = options;

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...rest,
  }).format(safeAmount);
}
