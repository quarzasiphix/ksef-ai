import { BankTransaction } from "@/types/bank";

// Enhanced parser for Polish bank XML (MT940 XML or custom XML)
export function parseBankXml(xml: string, accountId: string): BankTransaction[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  // 1. Try to parse <operation> nodes (custom XML as in user sample)
  const opNodes = Array.from(doc.querySelectorAll("operation"));
  if (opNodes.length > 0) {
    return opNodes.map((node, i) => {
      const get = (tag: string) => node.querySelector(tag)?.textContent?.trim() || "";
      const date = get("exec-date") || get("order-date") || "";
      const description = get("description") || get("type") || "";
      const amountNode = node.querySelector("amount");
      let amountRaw = amountNode?.textContent?.replace(/\s/g, "").replace(",", ".") || "0";
      amountRaw = amountRaw.replace(/^\+/, "");
      const amount = parseFloat(amountRaw);
      const currency = amountNode?.getAttribute("curr") || "PLN";
      const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
      return {
        id: `imported-xml-op-${i}-${Date.now()}`,
        accountId,
        date,
        description,
        amount,
        currency,
        type,
      };
    }).filter((t) => t.date && t.description && !isNaN(t.amount));
  }

  // 2. Fallback to previous logic for other XMLs
  const txNodes = Array.from(
    doc.querySelectorAll("transaction, entry, operation, ntry, StatementEntry")
  );
  if (txNodes.length === 0) return [];

  return txNodes.map((node, i) => {
    const get = (tag: string) => node.querySelector(tag)?.textContent?.trim() || "";
    const date = get("date") || get("bookingDate") || get("entryDate") || get("DtBookg") || get("BookingDate");
    const amountRaw = get("amount") || get("amt") || get("Amount") || get("Amt") || get("value");
    const currency = get("currency") || get("Ccy") || get("Currency") || "PLN";
    const desc = get("description") || get("desc") || get("Description") || get("RmtInf") || get("Info") || get("details") || "";
    let amount = parseFloat(amountRaw.replace(/\s/g, "").replace(",", ".") || "0");
    const crdb = get("creditDebitIndicator") || get("CdtDbtInd") || "";
    if (crdb.toUpperCase() === "DB" || crdb.toUpperCase() === "DEBIT") amount = -Math.abs(amount);
    if (crdb.toUpperCase() === "CR" || crdb.toUpperCase() === "CREDIT") amount = Math.abs(amount);
    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    return {
      id: `imported-xml-${i}-${Date.now()}`,
      accountId,
      date,
      description: desc,
      amount,
      currency,
      type,
    };
  }).filter((t) => t.date && t.description && !isNaN(t.amount));
} 