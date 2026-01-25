import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Building2, Star, User, CreditCard, FileText, Plus, Edit2, ArrowLeft, AlertCircle, Users, Network, Shield, AlertTriangle } from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { toast } from "sonner";
import { cn } from "@/shared/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import PremiumCheckoutModal from "@/modules/premium/components/PremiumCheckoutModal";
import PremiumSuccessMessage from "@/modules/premium/components/PremiumSuccessMessage";
import SupportFooter from "@/components/layout/SupportFooter";
import { useHeartbeat } from "@/shared/hooks/useHeartbeat";
import AccountOnboardingWidget from '@/modules/onboarding/components/welcome/AccountOnboardingWidget';
import { useQuery } from "@tanstack/react-query";
import { getBusinessProfiles } from "@/modules/settings/data/businessProfileRepository";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";

const SettingsMenu = () => {
  const { isPremium, user, supabase } = useAuth();
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

  // Premium status is maintained by websocket, no need for extra API call

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

  const { profiles: ownedProfiles, selectedProfileId } = useBusinessProfile();
  const activeProfile = useMemo(
    () => ownedProfiles.find((p) => p.id === selectedProfileId) || ownedProfiles[0] || null,
    [ownedProfiles, selectedProfileId]
  );
  const isNestedRoute = location.pathname !== '/settings';

  if (isNestedRoute) {
    return <Outlet />;
  }

  return (
    <div className="space-y-8 pb-32 md:pb-24 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Ustawienia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kontroluj konto, firmę i strukturę organizacyjną
          </p>
        </div>
      </div>

      
      {/* Konto (global scope) */}
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Konto</p>
          <h2 className="text-2xl font-semibold mt-1">Dotyczy Twojego konta we wszystkich firmach</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Odpowiedzialność użytkownika</CardTitle>
            <p className="text-sm text-muted-foreground">
              Decyzje, które wpływają na Twoje konto i dostęp do każdej firmy.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: <CreditCard className="h-4 w-4 text-slate-500" />,
                title: "Plan usługi",
                desc: `Status: ${isPremium ? "Aktywny – wszystkie funkcje odblokowane" : "Plan podstawowy – ograniczony dostęp"}`,
                actionLabel: "Zarządzaj subskrypcją",
                onClick: () => setShowPremiumModal(true),
                disabled: false,
              },
              {
                icon: <User className="h-4 w-4 text-slate-500" />,
                title: "Profil użytkownika",
                desc: "Email, hasło, urządzenia i preferencje powiadomień.",
                actionLabel: "Zarządzaj profilem",
                onClick: () => navigate('/settings/profile'),
                disabled: false,
              },
              {
                icon: <Shield className="h-4 w-4 text-slate-500" />,
                title: "Bezpieczeństwo",
                desc: "Sesje, uwierzytelnianie wieloskładnikowe i logi bezpieczeństwa (wkrótce).",
                actionLabel: "Wkrótce",
                onClick: () => {},
                disabled: true,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  {item.icon}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={item.onClick} disabled={item.disabled}>
                  {item.actionLabel}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Firma (active business scope) */}
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Firma</p>
          <h2 className="text-2xl font-semibold mt-1">
            Konfigurujesz ustawienia dla: {activeProfile?.name || "Brak aktywnej firmy"}
          </h2>
          {activeProfile && (
            <p className="text-sm text-muted-foreground">
              {activeProfile.entityType === 'sp_zoo'
                ? "Spółka z ograniczoną odpowiedzialnością"
                : activeProfile.entityType === 'sa'
                  ? "Spółka akcyjna"
                  : "Działalność gospodarcza"}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Konfiguracja operacyjna firmy</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Decyzje, które wpływają na dokumenty i zgodność dla bieżącej firmy.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                icon: <Building2 className="h-4 w-4 text-blue-500" />,
                title: "Dane firmy",
                desc: "Nazwa, NIP, adres, forma opodatkowania, zwolnienie z VAT i inne podstawowe dane.",
                action: () => activeProfile && navigate(`/settings/business-profiles/${activeProfile.id}/edit`),
                actionLabel: "Edytuj dane firmy",
                disabled: !activeProfile,
              },
              {
                icon: <FileText className="h-4 w-4 text-purple-500" />,
                title: "Dokumenty",
                desc: "Szablony, numeracja i formaty wpływają na wszystkie nowe faktury.",
                action: () => navigate('/settings/documents'),
                actionLabel: "Skonfiguruj dokumenty",
              },
              {
                icon: <Users className="h-4 w-4 text-teal-500" />,
                title: "Zespół",
                desc: "Zarządzaj rolami i dostępem księgowych, pełnomocników i współpracowników.",
                action: () => navigate('/settings/team'),
                actionLabel: "Zarządzaj zespołem",
              },
              {
                icon: <Star className="h-4 w-4 text-indigo-500" />,
                title: "Udostępnione linki",
                desc: "Publiczne linki i API z dostępem do dokumentów tej firmy.",
                action: () => navigate('/shares'),
                actionLabel: "Przeglądaj linki",
              },
              {
                icon: <Network className="h-4 w-4 text-blue-500" />,
                title: "Integracje",
                desc: "Połączenia z ERP, bankami i automatyką dokumentów.",
                action: () => navigate('/settings/erp'),
                actionLabel: "Konfiguruj integracje",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  {item.icon}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={item.action} disabled={item.disabled}>
                  {item.actionLabel}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              Zaawansowane / ryzykowne
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Działania wymagające ostrożności — mogą wpływać na zgodność i historię firmy.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Reset numeracji dokumentów
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Zmiana waluty bazowej
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Usunięcie firmy
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Zmiana jurysdykcji (wkrótce)
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Struktura organizacyjna */}
      <div className="space-y-6">
        <div className="border-b pb-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Struktura organizacyjna</p>
          <h2 className="text-2xl font-bold flex items-center gap-2 mt-1">
            <Building2 className="h-6 w-6 text-blue-500" />
            Profile biznesowe i struktura
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Zarządzaj firmami przypisanymi do Twojego konta i zmieniaj firmę domyślną.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Profile biznesowe</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {businessProfiles.length > 0 
                    ? `Zarządzasz ${businessProfiles.length} ${businessProfiles.length === 1 ? 'firmą' : 'firmami'}`
                    : 'Dodaj swoją pierwszą firmę'}
                </p>
              </div>
              <Button 
                onClick={() => navigate('/settings/business-profiles/new')}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Dodaj firmę
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
                            {profile.entityType === 'sp_zoo' ? 'Spółka z o.o.' : profile.entityType === 'sa' ? 'Spółka akcyjna' : 'Działalność gospodarcza'}
                          </p>
                        </div>
                        {profile.isDefault && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            Domyślna
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
                  Dodaj pierwszą firmę
                </Button>
              </div>
            )}
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
