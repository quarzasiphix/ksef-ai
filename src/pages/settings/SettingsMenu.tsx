import React, { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Star, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import PremiumSuccessMessage from "@/components/premium/PremiumSuccessMessage";
import SupportFooter from "@/components/layout/SupportFooter";

const SettingsMenu = () => {
  const { isPremium, openPremiumDialog, isShowingPremiumSuccess, hidePremiumSuccess } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    if (status) {
      if (status === 'success') {
        // Success toast is now handled globally in AuthProvider when isPremium changes
        // toast.success("Płatność zakończona sukcesem! Twoja subskrypcja Premium jest aktywna.");
      } else if (status === 'cancelled') {
        toast.info("Płatność anulowana. Możesz spróbować ponownie.");
      }

      setSearchParams({});

      // Success message display is now handled globally
    }

  }, [searchParams, setSearchParams, navigate, toast]);

  const isNestedRoute = location.pathname !== '/settings';

  const premiumFeatures = [
    "Tworzenie wielu profili firmowych",
    "Generowanie faktur bez limitu",
    "Pełny dostęp do statystyk i raportów",
    "Wsparcie KSeF (wkrótce)",
    "Priorytetowe wsparcie techniczne",
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {isPremium ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className={cn("flex items-center font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-500 to-amber-700")}
          >
            <Star className="mr-2 h-5 w-5" fill="currentColor" />
            <span>Jesteś Premium, zarządzaj subskrypcją</span>
          </motion.div>
        ) : (
          <Button variant="default" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={openPremiumDialog}>
            <Star className="mr-2 h-4 w-4" />
            Kup subskrypcję Premium
          </Button>
        )}
      </div>

      <Outlet />
      <SupportFooter />
    </div>
  );
};

export default SettingsMenu;