import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useSearchParams, useLocation } from 'react-router-dom';
import { Settings, Building2, Star, User, CreditCard, FileText, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PremiumCheckoutModal from "@/components/premium/PremiumCheckoutModal";
import PremiumSuccessMessage from "@/components/premium/PremiumSuccessMessage";
import SupportFooter from "@/components/layout/SupportFooter";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import AccountOnboardingWidget from '@/components/welcome/AccountOnboardingWidget';
import SettingCategory from "@/components/settings/SettingCategory";

const SettingsMenu = () => {
  const { isPremium } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const lastPremium = useRef<boolean | null>(null);
  const location = useLocation();
  const [showOnboardingWidget, setShowOnboardingWidget] = React.useState(true);

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
        // First heartbeat, just set the value, don't show modal
        lastPremium.current = status.premium;
        return;
      }
      if (lastPremium.current === false && status.premium === true) {
        setShowSuccessModal(true);
      }
      lastPremium.current = status.premium;
    }
  });

  // Check if onboarding widget should show (no invoices)
  // This is a placeholder; you may want to use a global data hook or prop
  React.useEffect(() => {
    // You should replace this with a real check for invoices
    const invoices = (window as any).__INVOICES__ || [];
    setShowOnboardingWidget(invoices.length === 0);
  }, []);

  const isNestedRoute = location.pathname !== '/settings';

  if (isNestedRoute) {
    return <Outlet />;
  }

  const settingsCategories = [
    {
      title: "Członkostwo",
      icon: Crown,
      items: [
        {
          title: "Plan Premium",
          description: isPremium ? "Zarządzaj swoją subskrypcją" : "Upgrade do Premium",
          action: () => setShowPremiumModal(true),
          premium: true
        }
      ]
    },
    {
      title: "Konto użytkownika",
      icon: User,
      items: [
        {
          title: "Profil użytkownika",
          description: "Zarządzaj danymi swojego konta",
          href: "/settings/profile"
        }
      ]
    },
    {
      title: "Ustawienia biznesowe",
      icon: Building2,
      items: [
        {
          title: "Profile biznesowe",
          description: "Zarządzaj swoimi firmami i danymi kontaktowymi",
          href: "/settings/business-profiles"
        },
        {
          title: "Ustawienia dokumentów",
          description: "Konfiguruj szablony faktur i numerację",
          href: "/settings/documents"
        }
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Ustawienia</h1>
        
        {isPremium ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700"
          >
            <Star className="mr-2 h-5 w-5 text-amber-500" fill="currentColor" />
            <span>Konto Premium</span>
          </motion.div>
        ) : null}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((cat) => (
          <SettingCategory key={cat.title} {...cat} isPremium={isPremium} />
        ))}
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
