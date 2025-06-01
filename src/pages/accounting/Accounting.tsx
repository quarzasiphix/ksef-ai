import React, { useEffect, useState } from 'react';
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Invoice, Expense } from "@/types";
import { format, parseISO, isPast, addMonths, isBefore } from "date-fns";
import { generateJpckV7Data, generateJpckV7Xml } from "@/integrations/jpk/jpkV7Generator";
import { useGlobalData } from "@/hooks/use-global-data";
import { pl } from 'date-fns/locale';

const Accounting = () => {
  const { isPremium, openPremiumDialog, user } = useAuth();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month'); // State for selected period
  const [reportingPeriods, setReportingPeriods] = useState<{
    period: string; // YYYY-MM format
    deadline: string; // YYYY-MM-DD format
    status: 'not-due' | 'due-soon' | 'overdue';
  }[]>([]);

  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData(selectedPeriod);
  const { invoices: { data: allInvoices, isLoading: isLoadingAllInvoices } } = useGlobalData(undefined, true);

  const loadingData = isLoadingInvoices || isLoadingExpenses; // Combine loading states

  const [generatedXml, setGeneratedXml] = useState<string | null>(null);

  // Function to trigger JPK generation for a specific period
  const handleGenerateJpck = (periodToGenerate: string) => {
    if (!selectedProfileId || !profiles) {
      console.error("Cannot generate JPK: Business profile not selected or profiles not loaded.");
      // Optionally show a user-friendly message
      return;
    }

    const selectedProfile = profiles.find(p => p.id === selectedProfileId);
    if (!selectedProfile) {
      console.error("Cannot generate JPK: Selected business profile not found.");
      // Optionally show a user-friendly message
      return;
    }

    // Get start and end dates for the specified period
    const [year, month] = periodToGenerate.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const periodDates = {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };

    // Filter invoices and expenses for the specific period
    const invoicesForPeriod = allInvoices.filter(invoice => {
      const issueDate = parseISO(invoice.issueDate);
      return isBefore(issueDate, parseISO(periodDates.endDate + 'T23:59:59')) && !isBefore(issueDate, parseISO(periodDates.startDate + 'T00:00:00'));
    });

    // Note: Currently expenses are not filtered by period in useGlobalData when fetchAllInvoices is true.
    // We would need to adjust useGlobalData or filter expenses here if needed for JPK.
    // For JPK, we need both income (invoices) and expenses for the period.
    // Let's assume for now that all expenses fetched by useGlobalData (even with fetchAllInvoices) are relevant, or that we need to adjust useGlobalData to fetch all expenses too.
    // For accurate JPK, we need expenses only for the given period.
    // I will filter expenses here temporarily, assuming expenses fetched by useGlobalData are *all* expenses for the profile.
    const expensesForPeriod = expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isBefore(expenseDate, parseISO(periodDates.endDate + 'T23:59:59')) && !isBefore(expenseDate, parseISO(periodDates.startDate + 'T00:00:00'));
    });

    // Generate the JPK data structure using filtered data
    const jpkData = generateJpckV7Data(invoicesForPeriod, expensesForPeriod, selectedProfile, periodDates);

    if (jpkData) {
      // Generate the XML from the data structure
      const xml = generateJpckV7Xml(jpkData);
      setGeneratedXml(xml);
      console.log("JPK XML Generated for period", periodToGenerate, ":", xml);
      // Implement download functionality here
      if(xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const periodName = periodToGenerate.replace('-', '_');
        a.download = `JPK_V7_${selectedProfile.taxId || 'firma'}_${periodName}.xml`; // Suggested filename format
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up
      }
    } else {
      setGeneratedXml(null);
      console.error("JPK data generation failed for period", periodToGenerate);
    }
  };

  useEffect(() => {
    if (!isPremium) {
      openPremiumDialog();
    }
  }, [isPremium, openPremiumDialog]);

  useEffect(() => {
    if (!allInvoices || allInvoices.length === 0 || !selectedProfileId) {
      setReportingPeriods([]); // Clear periods if no invoices or profile selected
      return;
    }

    // Find the earliest invoice date for the selected profile
    const profileInvoices = allInvoices.filter(inv => inv.businessProfileId === selectedProfileId);
    if (profileInvoices.length === 0) {
      setReportingPeriods([]);
      return;
    }

    const earliestInvoiceDate = profileInvoices.reduce((earliest, invoice) => {
      const issueDate = parseISO(invoice.issueDate); // Parse the ISO string date
      return earliest === null || isBefore(issueDate, earliest) ? issueDate : earliest;
    }, null as Date | null);

    if (!earliestInvoiceDate) {
      setReportingPeriods([]);
      return;
    }

    // Generate monthly reporting periods from the earliest invoice month to the current month
    const periods: { period: string; deadline: string; status: 'not-due' | 'due-soon' | 'overdue' }[] = [];
    let currentPeriodDate = new Date(earliestInvoiceDate.getFullYear(), earliestInvoiceDate.getMonth(), 1);
    const today = new Date();
    const filingDay = 20; // JPK filing deadline is usually 20th of the next month

    while (isBefore(currentPeriodDate, addMonths(today, 1))) { // Include current month's period
      const period = format(currentPeriodDate, 'yyyy-MM');
      const nextMonth = addMonths(currentPeriodDate, 1);
      const deadlineDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), filingDay);
      const deadline = format(deadlineDate, 'yyyy-MM-dd');

      let status: 'not-due' | 'due-soon' | 'overdue';
      const daysUntilDeadline = (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

      if (isPast(deadlineDate) && format(today, 'yyyy-MM-dd') > deadline) { // Check if today is past the deadline
        status = 'overdue';
      } else if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0) {
        status = 'due-soon';
      } else {
        status = 'not-due';
      }

      periods.push({ period, deadline, status });

      currentPeriodDate = addMonths(currentPeriodDate, 1);
    }

    setReportingPeriods(periods);

  }, [allInvoices, selectedProfileId]); // Recalculate when allInvoices or selectedProfileId changes

  // Calculate total income and expenses for the selected period
  const totalIncome = invoices.reduce((sum, invoice) => {
    const income = invoice.totalGrossValue || 0;
    console.log(`Calculating income for invoice ${invoice.number}: ${income}, current sum: ${sum}`);
    return sum + income;
  }, 0);

  const totalExpenses = expenses.reduce((sum, expense) => {
    const expenseAmount = expense.amount || 0; // Assuming amount is the relevant field for expense value
    console.log(`Calculating expense for expense item (ID: ${expense.id}): ${expenseAmount}, current sum: ${sum}`); // Added expense ID log
    return sum + expenseAmount;
  }, 0);

  if (!isPremium) {
    return null;
  }

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700">
         Panel Księgowanie
      </h1>

      {/* Business Profile Selector for Accounting */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wybierz profil firmowy</CardTitle>
        </CardHeader>
        <CardContent>
            {isLoadingProfiles ? (
                 <span className="text-sm text-muted-foreground">Ładowanie profili...</span>
             ) : profiles && profiles.length > 0 ? (
                 <Select value={selectedProfileId || ''} onValueChange={selectProfile}>
                     <SelectTrigger className="w-full md:w-[250px]">
                         <SelectValue placeholder="Wybierz profil" />
                     </SelectTrigger>
                     <SelectContent>
                         {profiles.map(profile => (
                             <SelectItem key={profile.id} value={profile.id}>
                                 {profile.name}
                             </SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
             ) : (
                  <span className="text-sm text-muted-foreground">Brak dostępnych profili firmowych. Dodaj nowy profil w Ustawieniach.</span>
             )}
        </CardContent>
      </Card>

      {/* Period Selector */}
       <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wybierz okres rozliczeniowy</CardTitle>
        </CardHeader>
        <CardContent>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Wybierz okres" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="this_month">Bieżący miesiąc</SelectItem>
                    <SelectItem value="last_month">Poprzedni miesiąc</SelectItem>
                    <SelectItem value="this_quarter">Bieżący kwartał</SelectItem>
                    <SelectItem value="last_quarter">Poprzedni kwartał</SelectItem>
                    <SelectItem value="this_year">Bieżący rok</SelectItem>
                    <SelectItem value="last_year">Poprzedni rok</SelectItem>
                </SelectContent>
            </Select>
        </CardContent>
      </Card>

      {/* JPK Generation Section */}
       <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generowanie JPK V7M</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground">Generuj i pobierz plik JPK V7M dla wybranego okresu rozliczeniowego i profilu firmowego.</p>
           <Button onClick={() => handleGenerateJpck(selectedPeriod)} disabled={!selectedProfileId || loadingData || !isPremium} className="w-full md:w-auto">Pobierz JPK V7M XML</Button>
           {/* Optionally display a link to download the generated XML if not using direct download */}
           {/* {generatedXml && ( <a href={\`data:application/xml;charset=utf-8,\\${encodeURIComponent(generatedXml)}\`} download={\`JPK_V7_\${selectedProfileId || \\\'jpk\\\'}_\\${selectedPeriod}.xml\`}>Pobierz JPK XML</a> )} */}
        </CardContent>
      </Card>

      {/* General Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statystyki ogólne ({selectedPeriod.replace('_', ' ')})</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Placeholder for Income Stats */}
          <Card className="bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Przychody</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />{/* Placeholder Icon */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? 'Ładowanie...' : totalIncome.toFixed(2)} PLN</div>
              <p className="text-xs text-muted-foreground">+0.00% od ostatniego miesiąca</p>{/* Placeholder Value */}
            </CardContent>
          </Card>

          {/* Placeholder for Expenses Stats */}
           <Card className="bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wydatki</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />{/* Placeholder Icon */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? 'Ładowanie...' : totalExpenses.toFixed(2)} PLN</div>
              <p className="text-xs text-muted-foreground">+0.00% od ostatniego miesiąca</p>{/* Placeholder Value */}
            </CardContent>
          </Card>

          {/* Placeholder for VAT Stats */}
           <Card className="bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VAT</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />{/* Placeholder Icon */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.00 PLN</div>{/* Placeholder Value */}
              <p className="text-xs text-muted-foreground">Oblicz VAT za ostatni okres</p>{/* Placeholder Action */}
            </CardContent>
          </Card>

        </CardContent>
      </Card>

      {/* Required JPK Reports Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wymagane Raporty JPK</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAllInvoices ? (
             <span className="text-sm text-muted-foreground">Ładowanie danych do raportów...</span>
           ) : reportingPeriods.length === 0 ? (
             <span className="text-sm text-muted-foreground">Brak danych do wygenerowania raportów. Dodaj pierwszą fakturę.</span>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full table-auto">
                 <thead>
                   <tr className="border-b">
                     <th className="px-4 py-2 text-left">Okres</th>
                     <th className="px-4 py-2 text-left">Termin złożenia</th>
                     <th className="px-4 py-2 text-left">Status</th>
                     <th className="px-4 py-2 text-left">Akcje</th>
                   </tr>
                 </thead>
                 <tbody>
                   {reportingPeriods.map(({ period, deadline, status }) => {
                     // Determine row styling based on status
                     let rowClass = '';
                     let statusText = '';
                     switch (status) {
                       case 'overdue':
                         rowClass = 'bg-red-100'; // Light red background
                         statusText = 'Zaległy';
                         break;
                       case 'due-soon':
                         rowClass = 'bg-yellow-100'; // Light yellow background
                         statusText = 'Termin wkrótce';
                         break;
                       case 'not-due':
                         rowClass = 'bg-green-100'; // Light green background
                         statusText = 'Do złożenia'; // Or 'Złożony' if we add filing status tracking
                         break;
                     }
                     const periodFormatted = format(parseISO(`${period}-01`), 'MMMM yyyy', { locale: pl });
                     const deadlineFormatted = format(parseISO(deadline), 'dd.MM.yyyy');
                     const isCurrentOrUpcomingPeriod = period === format(new Date(), 'yyyy-MM') || isBefore(parseISO(`${period}-01`), addMonths(new Date(), 1));
                     const showGenerateButton = isCurrentOrUpcomingPeriod && (status === 'not-due' || status === 'due-soon'); // Show button for current/upcoming and not yet filed (based on status placeholder)

                     return (
                       <tr key={period} className={`border-b ${rowClass}`}>
                         <td className="px-4 py-2">{periodFormatted}</td>
                         <td className="px-4 py-2">{deadlineFormatted}</td>
                         <td className="px-4 py-2">{statusText}</td>
                         <td className="px-4 py-2">
                           {showGenerateButton && (
                             // Pass the current period to handleGenerateJpck
                             <Button size="sm" onClick={() => handleGenerateJpck(period)} disabled={!selectedProfileId || loadingData || !isPremium}>
                               Generuj JPK
                             </Button>
                           )}
                           {/* TODO: Add button to view/download previously generated JPKs if we implement storage */}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           )}
        </CardContent>
      </Card>

      {/* KSeF Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status KSeF</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Status integracji z KSeF będzie dostępny wkrótce.</p>
          {/* Placeholder for KSeF status display and actions */}
        </CardContent>

      {/* KSeF Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generowanie i wysyłka KSeF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground">Generuj i wyślij faktury do Krajowego Systemu e-Faktur (KSeF) dla wybranego okresu rozliczeniowego i profilu firmowego.</p>
           {/* TODO: Implement KSeF generation and sending logic */}
           <Button onClick={() => console.log('Generate and Send KSeF clicked')} disabled={!selectedProfileId || loadingData || !isPremium} className="w-full md:w-auto">Generuj i Wyślij KSeF</Button>
        </CardContent>
      </Card>
      </Card>

      {/* JPK and Tax Section */}
       <Card>
        <CardHeader>
          <CardTitle className="text-lg">Podatki</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground">Funkcje obliczeń podatkowych będą dostępne wkrótce.</p>
           {/* Placeholder for tax calculation features */}
           <Button variant="secondary" disabled>Oblicz Podatek Dochodowy (Wkrótce)</Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default Accounting;
