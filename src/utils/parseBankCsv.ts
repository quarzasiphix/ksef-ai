import { BankTransaction } from "@/types/bank";

export function parseBankCsv(csv: string, accountId: string): BankTransaction[] {
  // Try to detect separator
  const sep = csv.includes(";") ? ";" : ",";
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());

  // Support both English and Polish column names
  const dateIdx = header.findIndex(
    (h) => h.includes("date") || h.includes("data operacji") || h.includes("data")
  );
  const descIdx = header.findIndex(
    (h) => h.includes("description") || h.includes("opis transakcji") || h.includes("opis")
  );
  const amountIdx = header.findIndex(
    (h) => h.includes("amount") || h.includes("kwota")
  );
  const currIdx = header.findIndex(
    (h) => h.includes("currency") || h.includes("waluta")
  );

  return lines.slice(1).map((line, i) => {
    const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
    // Polish CSVs may use comma as decimal separator
    let amountRaw = cols[amountIdx]?.replace(/\s/g, "").replace(",", ".") || "0";
    // Remove plus sign if present
    amountRaw = amountRaw.replace(/^\+/, "");
    const amount = parseFloat(amountRaw);
    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    return {
      id: crypto.randomUUID(), // Use proper UUID
      accountId,
      date: cols[dateIdx] || "",
      description: cols[descIdx] || "",
      amount,
      currency: cols[currIdx] || "PLN",
      type,
    };
  }).filter((t) => t.date && t.description && !isNaN(t.amount));
} 