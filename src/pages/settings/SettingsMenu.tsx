import React, { useState, useEffect } from 'react';
import { Link, Outlet, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Building2, Star, User } from "lucide-react";
import { useAuth } from "@/App";
import PremiumCheckoutModal from "@/components/PremiumCheckoutModal";
import { toast } from "sonner";

const SettingsMenu = () => {
  const { isPremium } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    const status = searchParams.get('status');
    const sessionId = searchParams.get('session_id');

    if (status === 'success') {
      toast.success("Płatność zakończona sukcesem! Twoja subskrypcja Premium jest aktywna.");

    } else if (status === 'cancelled') {
      toast.info("Płatność anulowana. Możesz spróbować ponownie.");
    }

    if (status || sessionId) {
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, navigate]);

  const isNestedRoute = location.pathname !== '/settings';

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ustawienia</h1>
          <p className="text-muted-foreground">
            Zarządzaj ustawieniami konta i profilami firmowymi.
          </p>
        </div>
        {isPremium ? (
          <div className="flex items-center text-amber-500 font-semibold">
            <Star className="mr-2 h-5 w-5" fill="currentColor" />
            <span>Jesteś Premium, zarządzaj subskrypcją</span>
          </div>
        ) : (
          <Button variant="default" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={handleOpenModal}>
            <Star className="mr-2 h-4 w-4" />
            Kup subskrypcję Premium
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menu Ustawień</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Link to="/settings/profile">
              <Button variant="outline" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Ustawienia Profilu
              </Button>
            </Link>
            <Link to="/settings/business-profiles">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Profile Firmowe
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Outlet />

      <PremiumCheckoutModal isOpen={isModalOpen} onClose={handleCloseModal} />

    </div>
  );
};

export default SettingsMenu;