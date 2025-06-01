import React, { useEffect, useState } from 'react';
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Invoice, Expense } from "@/types";
import { format } from "date-fns";
import { generateJpckV7Data, generateJpckV7Xml } from "@/integrations/jpk/jpkV7Generator";
import { useGlobalData } from "@/hooks/use-global-data";

const Accounting = () => {
  const { isPremium, openPremiumDialog, user } = useAuth();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();

  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month'); // State for selected period

  const { invoices: { data: invoices, isLoading: isLoadingInvoices }, expenses: { data: expenses, isLoading: isLoadingExpenses } } = useGlobalData(selectedPeriod);
  const loadingData = isLoadingInvoices || isLoadingExpenses; // Combine loading states

  const [generatedXml, setGeneratedXml] = useState<string | null>(null);

  // Function to get start and end dates based on selected period
  const getPeriodDates = (period: string): { startDate: string, endDate: string } => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
        endDate = new Date(now.getFullYear(), lastQuarter * 3 + 3, 0);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        // Default to this month if period is not recognized
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Format dates to YYYY-MM-DD for easier comparison/filtering
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  };

  useEffect(() => {
    if (!isPremium) {
      openPremiumDialog();
    }
  }, [isPremium, openPremiumDialog]);

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

  // Function to trigger JPK generation
  const handleGenerateJpck = () => {
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

    const periodDates = getPeriodDates(selectedPeriod);

    // Generate the JPK data structure
    const jpkData = generateJpckV7Data(invoices, expenses, selectedProfile, periodDates);

    if (jpkData) {
      // Generate the XML from the data structure
      const xml = generateJpckV7Xml(jpkData);
      setGeneratedXml(xml);
      // Now you can provide this 'xml' string to the user for download
      console.log("JPK XML Generated:", xml);
      // Implement download functionality here
      if(xml) {
        const blob = new Blob([xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const periodName = selectedPeriod.replace('_', '-');
        a.download = `JPK_V7_${selectedProfile.taxId || 'firma'}_${periodName}.xml`; // Suggested filename format
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up
      }
    } else {
      setGeneratedXml(null);
      console.error("JPK data generation failed.");
    }
  };

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
           <p className="text-muted-foreground">Generuj plik JPK V7M dla wybranego okresu rozliczeniowego i profilu firmowego.</p>
           <Button onClick={handleGenerateJpck} disabled={!selectedProfileId || loadingData}>Generuj JPK V7M</Button>
           {/* Optionally display a link to download the generated XML if not using direct download */}
           {/* {generatedXml && ( <a href={\`data:application/xml;charset=utf-8,\${encodeURIComponent(generatedXml)}\`} download={\`JPK_V7_\${selectedProfileId || \'jpk\'}_\${selectedPeriod}.xml\`}>Pobierz JPK XML</a> )} */}
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

      {/* KSeF Status Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status KSeF</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Status integracji z KSeF będzie dostępny wkrótce.</p>
          {/* Placeholder for KSeF status display and actions */}
        </CardContent>
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
