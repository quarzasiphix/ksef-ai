import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Building2, Star, User, CreditCard, FileText, Crown, Plus, Edit2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PremiumCheckoutModal from "@/components/premium/PremiumCheckoutModal";
import PremiumSuccessMessage from "@/components/premium/PremiumSuccessMessage";
import SupportFooter from "@/components/layout/SupportFooter";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import AccountOnboardingWidget from '@/components/welcome/AccountOnboardingWidget';
import { useQuery } from "@tanstack/react-query";
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";

const SettingsMenu = () => {
  const { isPremium, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const lastPremium = useRef<boolean | null>(null);
  const location = useLocation();
  const [showOnboardingWidget, setShowOnboardingWidget] = React.useState(true);

  // Fetch business profiles
  const { data: businessProfiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['businessProfiles', user?.id],
    queryFn: () => user ? getBusinessProfiles(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  useEffect(() => {
    const status = searchParams.get('status');
    
    if (status) {
      if (status === 'success') {
        setShowSuccessModal(true);
      } else if (status === 'cancelled') {
        toast.info("Płatność anulowana. Możesz spróbować ponownie.");
      }
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Heartbeat: show success only on transition from false to true
  useHeartbeat({
    onStatus: (status) => {
      if (lastPremium.current === null) {
        lastPremium.current = status.premium;
        return;
      }
      if (lastPremium.current === false && status.premium === true) {
        setShowSuccessModal(true);
      }
      lastPremium.current = status.premium;
    }
  });

  React.useEffect(() => {
    const invoices = (window as any).__INVOICES__ || [];
    setShowOnboardingWidget(invoices.length === 0);
  }, []);

  const isNestedRoute = location.pathname !== '/settings';

  if (isNestedRoute) {
    return <Outlet />;
  }

  return (
    <div className="space-y-8 pb-32 md:pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Ustawienia</h1>
        
        {isPremium ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 rounded-xl blur-sm opacity-75" />
            <div className="relative bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white px-6 py-3 rounded-xl flex items-center font-bold shadow-lg">
              <Crown className="mr-2 h-5 w-5" fill="currentColor" />
              <span>Konto Premium</span>
            </div>
          </motion.div>
        ) : null}
      </div>

      {/* Premium Membership Section */}
      <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Członkostwo Premium
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isPremium ? (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-lg font-semibold text-green-600">Aktywne członkostwo Premium</p>
                <p className="text-muted-foreground">Dziękujemy za wsparcie! Korzystasz z pełni możliwości aplikacji.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowPremiumModal(true)}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                Zarządzaj subskrypcją
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-lg font-semibold">Rozszerz możliwości swojego konta</p>
                <p className="text-muted-foreground">Odblokuj wszystkie funkcje i wsparcie priorytetowe</p>
              </div>
              <Button 
                onClick={() => setShowPremiumModal(true)}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold px-6"
              >
                Upgrade do Premium
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Profiles Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-blue-500" />
              Profile biznesowe
            </CardTitle>
            <Button 
              onClick={() => navigate('/settings/business-profiles/new')}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Dodaj profil
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profilesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : businessProfiles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {businessProfiles.map((profile) => (
                <Card key={profile.id} className="border border-gray-200 hover:border-blue-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                        <p className="text-sm text-muted-foreground">NIP: {profile.taxId}</p>
                        <p className="text-sm text-muted-foreground">
                          Forma: {profile.entityType === 'sp_zoo' ? 'Spółka z o.o.' : profile.entityType === 'sa' ? 'Spółka akcyjna' : 'Działalność gospodarcza'}
                        </p>
                      </div>
                      {profile.isDefault && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Domyślny
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground mb-4">
                      <p>{profile.address}</p>
                      <p>{profile.postalCode} {profile.city}</p>
                      {profile.email && <p>{profile.email}</p>}
                      {profile.phone && <p>{profile.phone}</p>}
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/settings/business-profiles/${profile.id}/edit`)}
                        className="flex items-center gap-2"
                      >
                        <Edit2 className="h-3 w-3" />
                        Edytuj
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nie masz jeszcze żadnych profili biznesowych</p>
              <Button onClick={() => navigate('/settings/business-profiles/new')}>
                Dodaj pierwszy profil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Settings */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Account */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-500" />
              Konto użytkownika
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Zarządzaj danymi swojego konta</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings/profile')}
              className="w-full"
            >
              Edytuj profil użytkownika
            </Button>
          </CardContent>
        </Card>

        {/* Document Settings */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Ustawienia dokumentów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Konfiguruj szablony faktur i numerację</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings/documents')}
              className="w-full"
            >
              Zarządzaj dokumentami
            </Button>
          </CardContent>
        </Card>

        {/* Shared Links */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-indigo-500" />
              Udostępnione linki
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Zarządzaj aktywnymi publicznymi linkami do dokumentów</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/shares')}
              className="w-full"
            >
              Przeglądaj linki
            </Button>
          </CardContent>
        </Card>
      </div>

      <PremiumCheckoutModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />

      <PremiumSuccessMessage
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        premiumFeatures={[
          "Nieograniczone profile firmowe",
          "Nieograniczone faktury i dokumenty",
          "Zaawansowane raporty i statystyki",
          "Eksport danych (JPK, KSeF)",
          "Priorytetowe wsparcie techniczne",
          "Backup i synchronizacja danych"
        ]}
      />

      <SupportFooter />

      {showOnboardingWidget && (
        <div className="mt-8">
          <AccountOnboardingWidget mode="inline" forceShow={true} />
        </div>
      )}
    </div>
  );
};

export default SettingsMenu;
