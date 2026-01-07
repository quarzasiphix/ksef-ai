import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { useAuth } from "@/shared/hooks/useAuth";
import { calculateIncomeTax } from "@/shared/lib/tax-utils";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { Crown } from "lucide-react";
import AccountOnboardingWidget from '@/modules/onboarding/components/welcome/AccountOnboardingWidget';
import { getInvoiceValueInPLN } from "@/shared/lib/invoice-utils";
import { Button } from "@/shared/ui/button";
import SpoolkaDashboard from "@/modules/dashboard/components/SpoolkaDashboard";
import JDGDashboard from "@/modules/dashboard/components/JDGDashboard";

const Dashboard = () => {
  const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
  const { selectedProfileId, profiles, isLoadingProfiles } = useBusinessProfile();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData();
  const { isPremium, openPremiumDialog } = useAuth();
  
  const isLoading = isLoadingInvoices || isLoadingExpenses || isLoadingProfiles;

  // Redirect to onboarding if no profiles exist (first-time user)
  useEffect(() => {
    if (!isLoadingProfiles && profiles && profiles.length === 0) {
      console.log('[Dashboard] No profiles found, redirecting to onboarding');
      navigate('/welcome', { replace: true });
    }
  }, [isLoadingProfiles, profiles, navigate]);

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const missingSpoolkaBasics =
    isSpoolka &&
    (!selectedProfile?.krs_number || !selectedProfile?.share_capital);
  
  // Prevent flicker: mark when all data finished first load
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setDataReady(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (invoices?.length > 0) {
      generateMonthlySummaries(invoices);
    }
  }, [invoices]);
  
  const generateMonthlySummaries = (invoicesData: any[]) => {
    const monthlyData: Record<string, { totalNetValue: number, totalGrossValue: number, totalVatValue: number }> = {};
    
    invoicesData.forEach(invoice => {
      if (invoice.transactionType === 'income') {
        const date = new Date(invoice.issueDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            totalNetValue: 0,
            totalGrossValue: 0,
            totalVatValue: 0
          };
        }
        
        monthlyData[monthKey].totalNetValue += invoice.totalNetValue || 0;
        monthlyData[monthKey].totalGrossValue += invoice.totalGrossValue || 0;
        monthlyData[monthKey].totalVatValue += invoice.totalVatValue || 0;
      }
    });
    
    const formattedSummaries = Object.entries(monthlyData).map(([month, values]) => ({
      month,
      monthLabel: new Date(`${month}-01`).toLocaleString("pl-PL", { month: "short" }),
      ...values
    }));
    
    formattedSummaries.sort((a, b) => a.month.localeCompare(b.month));
    setMonthlySummaries(formattedSummaries);
  };


  // Financial calculations
  const totalRevenue = invoices
    .filter(inv => inv.transactionType === 'income')
    .reduce((sum, inv) => sum + getInvoiceValueInPLN(inv), 0);
  const totalExpensesCost = invoices
    .filter(inv => inv.transactionType === 'expense')
    .reduce((sum, inv) => sum + getInvoiceValueInPLN(inv), 0);
  const netProfit = totalRevenue - totalExpensesCost;
  const taxEstimate = isSpoolka 
    ? calculateIncomeTax(netProfit, 'linear') 
    : calculateIncomeTax(netProfit, selectedProfile?.tax_type || 'linear');

  const totalInvoices = invoices.filter(inv => inv.transactionType === 'income').length;
  const unpaidInvoices = invoices.filter(inv => inv.transactionType === 'income' && !inv.isPaid).length;


  const showOnboardingWidget = dataReady && invoices.length === 0;

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {showOnboardingWidget && (
        <AccountOnboardingWidget mode="inline" />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {isSpoolka ? 'Przegląd Spółki' : 'Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedProfile?.name || 'Twoja działalność'}
          </p>
        </div>
        {!isPremium && (
          <Button 
            onClick={() => openPremiumDialog()}
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white w-full sm:w-auto"
          >
            <Crown className="mr-2 h-4 w-4" />
            Kup Premium
          </Button>
        )}
      </div>

      {/* Personalized Dashboard Views */}
      {selectedProfile && (
        isSpoolka ? (
          <SpoolkaDashboard
            profile={selectedProfile}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpensesCost}
            netProfit={netProfit}
            taxEstimate={taxEstimate}
            unpaidInvoices={unpaidInvoices}
            totalInvoices={totalInvoices}
            isPremium={isPremium}
          />
        ) : (
          <JDGDashboard
            profile={selectedProfile}
            totalRevenue={totalRevenue}
            totalExpenses={totalExpensesCost}
            netProfit={netProfit}
            taxEstimate={taxEstimate}
            unpaidInvoices={unpaidInvoices}
            totalInvoices={totalInvoices}
            isPremium={isPremium}
            monthlySummaries={monthlySummaries}
            isMobile={isMobile}
          />
        )
      )}
    </div>
  );
};

export default Dashboard;
