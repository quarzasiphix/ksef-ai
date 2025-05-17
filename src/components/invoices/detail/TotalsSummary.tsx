import React from "react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/invoice-utils";

interface TotalsSummaryProps {
  totalNetValue: number;
  totalVatValue: number;
  totalGrossValue: number;
}

import { InvoiceType } from "@/types";

const TotalsSummary: React.FC<TotalsSummaryProps & { type: InvoiceType }> = ({ totalNetValue, totalVatValue, totalGrossValue, type }) => (
  <div style={{ marginTop: 24, fontWeight: 600, display: 'flex', justifyContent: 'flex-end' }}>
    <table>
      <tbody>
        <tr>
          <td style={{ padding: '4px 16px', color: '#888' }}>Razem netto:</td>
          <td style={{ padding: '4px 16px' }}>{formatCurrency(totalNetValue)}</td>
          {type !== InvoiceType.RECEIPT && <>
            <td style={{ padding: '4px 16px', color: '#888' }}>Razem VAT:</td>
            <td style={{ padding: '4px 16px' }}>{formatCurrency(totalVatValue)}</td>
          </>}
          <td style={{ padding: '4px 16px', color: '#0d6efd' }}>Do zapłaty (brutto):</td>
          <td style={{ padding: '4px 16px', color: '#0d6efd' }}>{formatCurrency(totalGrossValue)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);


export default TotalsSummary;
