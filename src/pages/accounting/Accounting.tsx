import React, { useEffect } from 'react';
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const Accounting = () => {
  const { isPremium, openPremiumDialog } = useAuth();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();

  useEffect(() => {
    if (!isPremium) {
      openPremiumDialog();
    }
  }, [isPremium, openPremiumDialog]);

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

      {/* General Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statystyki ogólne</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Placeholder for Income Stats */}
          <Card className="bg-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Przychody</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />{/* Placeholder Icon */}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0.00 PLN</div>{/* Placeholder Value */}
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
              <div className="text-2xl font-bold">0.00 PLN</div>{/* Placeholder Value */}
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
          <CardTitle className="text-lg">Generowanie JPK i Podatki</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <p className="text-muted-foreground">Funkcje generowania JPK i obliczeń podatkowych będą dostępne wkrótce.</p>
           {/* Placeholder for JPK generation and tax calculation features */}
           <Button variant="secondary" disabled>Generuj JPK V7M (Wkrótce)</Button>
           <Button variant="secondary" disabled>Oblicz Podatek Dochodowy (Wkrótce)</Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default Accounting;
