import React, { useState } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Building2 } from 'lucide-react';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import Shareholders from '@/modules/accounting/screens/Shareholders';
import CapitalEvents from '@/modules/accounting/screens/CapitalEvents';

const EquityModule = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [activeTab, setActiveTab] = useState<'shareholders' | 'events'>('shareholders');

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  if (!isSpoolka) {
    return (
      <div className="space-y-6 pb-20 px-4 md:px-6">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Kapitał dostępny tylko dla Spółek</h2>
          <p className="text-muted-foreground">
            Ta funkcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Kapitał i wspólnicy</h1>
        <p className="text-sm text-muted-foreground">
          Struktura właścicielska i zdarzenia kapitałowe spółki
        </p>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'shareholders' | 'events')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shareholders">Wspólnicy</TabsTrigger>
          <TabsTrigger value="events">Zdarzenia kapitałowe</TabsTrigger>
        </TabsList>

        <TabsContent value="shareholders" className="mt-6">
          <Shareholders embedded />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <CapitalEvents />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EquityModule;
