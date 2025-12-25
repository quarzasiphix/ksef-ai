import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import FinancialLedger from '../components/FinancialLedger';
import { generateMockLedgerEvents } from '../data/mockLedgerData';
import type { LedgerFilters } from '../types/ledger';

export const LedgerPage: React.FC = () => {
  const [filters, setFilters] = useState<LedgerFilters>({});
  
  // TODO: Replace with actual data from backend
  const events = generateMockLedgerEvents();

  return (
    <div className="space-y-6 pb-20">
      {/* Back button */}
      <div>
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Main ledger */}
      <FinancialLedger
        events={events}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
};

export default LedgerPage;
