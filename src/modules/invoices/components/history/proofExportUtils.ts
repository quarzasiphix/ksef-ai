import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { InvoiceAuditTrail } from '../../types/auditTrail';

/**
 * Copy compact proof to clipboard
 */
export const copyProofToClipboard = async (auditTrail: InvoiceAuditTrail): Promise<void> => {
  const { invoice_number, invoice_id, versions, verification } = auditTrail;

  const issuedVersion = versions?.find(v => v.change_type === 'issued');
  const paidVersion = versions?.find(v => v.change_type === 'paid');
  const lastVersion = versions?.[versions.length - 1];

  // Calculate changes after issue
  const changesAfterIssue = issuedVersion
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(issuedVersion.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  // Calculate changes after payment
  const changesAfterPayment = paidVersion
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(paidVersion.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  const proofText = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOWÓD NIEZMIENNOŚCI FAKTURY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Faktura: ${invoice_number}
ID: ${invoice_id}

${issuedVersion ? `
✓ WYDANO (Issued)
  Data: ${format(new Date(issuedVersion.changed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
  Hash: ${issuedVersion.snapshot_hash}
` : '⚠ Nie wystawiono'}

${paidVersion ? `
✓ OPŁACONO (Paid)
  Data: ${format(new Date(paidVersion.changed_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
  Hash: ${paidVersion.snapshot_hash}
` : '⚠ Nieopłacona'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTEGRALNOŚĆ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ostatnia zmiana treści po wydaniu: ${changesAfterIssue === 0 ? 'BRAK ✓' : `${changesAfterIssue} zmian ⚠`}
Zmiany po opłaceniu: ${paidVersion ? (changesAfterPayment === 0 ? '0 ✓' : `${changesAfterPayment} ⚠`) : 'Nie dotyczy'}
Integralność łańcucha: ${verification?.valid ? 'ZWERYFIKOWANY ✓' : 'BŁĄD ⚠'}
Liczba wersji: ${versions?.length || 0}

${lastVersion ? `
Hash aktualnej wersji:
${lastVersion.chain_hash}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Wygenerowano: ${format(new Date(), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}
System: KsięgaI Audit Trail v1.0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ten dowód potwierdza niezmienność faktury poprzez kryptograficzny
łańcuch hashów SHA-256. Każda modyfikacja historycznych wpisów
zostanie wykryta podczas weryfikacji.
`.trim();

  await navigator.clipboard.writeText(proofText);
};

/**
 * Export audit proof to PDF or HTML
 */
export const exportAuditProof = async (
  auditTrail: InvoiceAuditTrail,
  exportFormat: 'pdf' | 'html'
): Promise<void> => {
  const { invoice_number, invoice_id, versions, verification, events } = auditTrail;

  const issuedVersion = versions?.find(v => v.change_type === 'issued');
  const paidVersion = versions?.find(v => v.change_type === 'paid');

  // Calculate changes after issue
  const changesAfterIssue = issuedVersion
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(issuedVersion.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  // Calculate changes after payment
  const changesAfterPayment = paidVersion
    ? versions?.filter(v => 
        new Date(v.changed_at) > new Date(paidVersion.changed_at) &&
        ['corrected', 'modified'].includes(v.change_type)
      ).length || 0
    : 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dowód Niezmienności - ${invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      font-size: 28px;
      color: #2563eb;
      margin-bottom: 10px;
    }
    .invoice-info {
      color: #666;
      font-size: 14px;
    }
    .proof-card {
      background: linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%);
      border: 2px solid #2563eb;
      border-radius: 8px;
      padding: 30px;
      margin: 30px 0;
    }
    .proof-card h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #1e40af;
    }
    .proof-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
    .proof-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .proof-item h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .proof-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .proof-item .date {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .proof-item .hash {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      background: #f3f4f6;
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
      word-break: break-all;
    }
    .status-ok { color: #16a34a; }
    .status-warning { color: #ea580c; }
    .status-error { color: #dc2626; }
    .timeline {
      margin: 30px 0;
    }
    .timeline h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #1e40af;
    }
    .timeline-item {
      border-left: 2px solid #e5e7eb;
      padding-left: 20px;
      padding-bottom: 20px;
      position: relative;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #2563eb;
    }
    .timeline-item .time {
      font-size: 12px;
      color: #666;
    }
    .timeline-item .title {
      font-size: 16px;
      font-weight: 600;
      margin: 4px 0;
    }
    .timeline-item .hash {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      background: #f3f4f6;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .proof-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Dowód Niezmienności Faktury</h1>
    <div class="invoice-info">
      <strong>Faktura:</strong> ${invoice_number} | 
      <strong>ID:</strong> ${invoice_id}
    </div>
  </div>

  <div class="proof-card">
    <h2>Podsumowanie Dowodu</h2>
    <div class="proof-grid">
      <div class="proof-item">
        <h3>Wydano (Issued)</h3>
        ${issuedVersion ? `
          <div class="value status-ok">✓ Wystawiono</div>
          <div class="date">${formatDate(issuedVersion.changed_at)}</div>
          <div class="hash">${issuedVersion.snapshot_hash}</div>
        ` : `
          <div class="value status-warning">⚠ Nie wystawiono</div>
        `}
      </div>

      <div class="proof-item">
        <h3>Opłacono (Paid)</h3>
        ${paidVersion ? `
          <div class="value status-ok">✓ Opłacono</div>
          <div class="date">${formatDate(paidVersion.changed_at)}</div>
          <div class="hash">${paidVersion.snapshot_hash}</div>
        ` : `
          <div class="value status-warning">⚠ Nieopłacona</div>
        `}
      </div>

      <div class="proof-item">
        <h3>Ostatnia zmiana treści</h3>
        <div class="value ${changesAfterIssue === 0 ? 'status-ok' : 'status-warning'}">
          ${changesAfterIssue === 0 ? 'Brak po wydaniu ✓' : `${changesAfterIssue} zmian po wydaniu`}
        </div>
      </div>

      <div class="proof-item">
        <h3>Zmiany po opłaceniu</h3>
        <div class="value ${changesAfterPayment === 0 ? 'status-ok' : 'status-warning'}">
          ${paidVersion ? (changesAfterPayment === 0 ? '0 ✓' : `${changesAfterPayment}`) : 'Nie dotyczy'}
        </div>
      </div>

      <div class="proof-item" style="grid-column: span 2;">
        <h3>Integralność łańcucha</h3>
        <div class="value ${verification?.valid ? 'status-ok' : 'status-error'}">
          ${verification?.valid ? 'Zweryfikowany ✓' : 'Błąd weryfikacji ⚠'}
        </div>
        <div class="date">${versions?.length || 0} wersji w łańcuchu</div>
      </div>
    </div>
  </div>

  <div class="timeline">
    <h2>Historia Zmian</h2>
    ${versions?.map(v => `
      <div class="timeline-item">
        <div class="time">${formatDate(v.changed_at)}</div>
        <div class="title">${getChangeTypeLabel(v.change_type)} (v${v.version_number})</div>
        ${v.change_reason ? `<div style="font-size: 14px; color: #666; font-style: italic;">${v.change_reason}</div>` : ''}
        <div class="hash">${v.snapshot_hash}</div>
      </div>
    `).join('') || '<p>Brak historii</p>'}
  </div>

  <div class="footer">
    <p><strong>Wygenerowano:</strong> ${format(new Date(), 'dd.MM.yyyy HH:mm:ss', { locale: pl })}</p>
    <p>System: KsięgaI Audit Trail v1.0</p>
    <p style="margin-top: 10px;">
      Ten dowód potwierdza niezmienność faktury poprzez kryptograficzny łańcuch hashów SHA-256.<br>
      Każda modyfikacja historycznych wpisów zostanie wykryta podczas weryfikacji.
    </p>
  </div>
</body>
</html>
  `.trim();

  if (exportFormat === 'html') {
    // Download as HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    a.download = `dowod-${invoice_number}-${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    // For PDF, we'll open in new window and let browser print to PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }
};

// Helper functions
function formatDate(date: string): string {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl });
}

function getChangeTypeLabel(changeType: string): string {
  const labels: Record<string, string> = {
    created: 'Utworzono',
    draft_saved: 'Zapisano wersję roboczą',
    issued: 'Wystawiono fakturę',
    paid: 'Oznaczono jako opłaconą',
    unpaid: 'Cofnięto płatność',
    cancelled: 'Anulowano',
    corrected: 'Skorygowano',
    modified: 'Zmodyfikowano',
  };
  return labels[changeType] || changeType;
}
