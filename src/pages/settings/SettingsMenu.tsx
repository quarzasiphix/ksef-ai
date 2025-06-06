import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Star, User, CreditCard, FileText, Crown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PremiumCheckoutModal from "@/components/premium/PremiumCheckoutModal";
import PremiumSuccessMessage from "@/components/premium/PremiumSuccessMessage";
import SupportFooter from "@/components/layout/SupportFooter";
import { useHeartbeat } from "@/hooks/useHeartbeat";

const SettingsMenu = () => {
  const { isPremium, openPremiumDialog } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const lastPremium = useRef<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
    <div className="space-y-6 pb-20">
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

      <div className="grid gap-6">
        {settingsCategories.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <category.icon className="mr-2 h-5 w-5" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div>
                      <h3 className="font-medium flex items-center">
                        {item.title}
                        {item.premium && isPremium && (
                          <Star className="ml-2 h-4 w-4 text-amber-500" fill="currentColor" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    {item.href ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={item.href}>Otwórz</Link>
                      </Button>
                    ) : item.action ? (
                      <Button 
                        variant={item.premium && !isPremium ? "default" : "outline"} 
                        size="sm" 
                        onClick={item.action}
                        className={item.premium && !isPremium ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                      >
                        {item.premium && !isPremium ? "Upgrade" : "Zarządzaj"}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
};

export default SettingsMenu;
