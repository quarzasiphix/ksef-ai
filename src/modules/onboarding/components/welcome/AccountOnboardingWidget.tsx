import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, CheckCircle2, Circle, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useAuth } from '@/shared/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getBusinessProfiles } from '@/modules/settings/data/businessProfileRepository';
import { getInvoices } from '@/modules/invoices/data/invoiceRepository';

const steps = [
  {
    key: 'hasBusinessProfile',
    label: 'Dodaj firmę',
    icon: <Building2 className="h-5 w-5 mr-2 text-blue-600" />,
  },
  {
    key: 'hasInvoice',
    label: 'Wystaw fakturę',
    icon: <FileText className="h-5 w-5 mr-2 text-orange-500" />,
  },
];

interface AccountOnboardingWidgetProps {
  mode?: 'inline' | 'popup';
  forceShow?: boolean;
}

const AccountOnboardingWidget = ({ mode = 'popup', forceShow = false }: AccountOnboardingWidgetProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [hasInvoice, setHasInvoice] = useState(false);

  // Fetch business profiles
  const { data: profiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['businessProfiles', user?.id],
    queryFn: () => user ? getBusinessProfiles(user.id) : Promise.resolve([]),
    enabled: !!user,
  });

  // Fetch invoices for all business profiles
  const { data: allInvoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['allInvoices', user?.id],
    queryFn: async () => {
      if (!user) return [];
      if (!profiles.length) return [];
      // Fetch invoices for each business profile
      const all = await Promise.all(
        profiles.map((profile: any) => getInvoices(user.id, profile.id))
      );
      // Flatten and return
      return all.flat();
    },
    enabled: !!user && profiles.length > 0,
  });

  useEffect(() => {
    setHasInvoice(allInvoices.length > 0);
  }, [allInvoices]);

  if (!user) return null;
  if (loadingProfiles || loadingInvoices) {
    return (
      <div className="fixed z-50 bottom-6 right-6 max-w-xs w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-900 p-4 flex items-center justify-center animate-fade-in">
        <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  const hasBusinessProfile = profiles.length > 0;

  // Only show if missing company or invoice
  if (!forceShow && hasBusinessProfile && hasInvoice) return null;

  // Prevent widget from rendering at all until loading is done and we know if it should show
  if (!loadingProfiles && !loadingInvoices && hasBusinessProfile && hasInvoice) {
    return null;
  }

  const status = {
    hasBusinessProfile,
    hasInvoice,
  };

  // Minimized bar
  if (mode === 'popup' && !open) {
    return (
      <div className="fixed z-50 bottom-6 right-6 max-w-xs w-full flex items-center bg-blue-600 text-white rounded-full shadow-2xl px-4 py-2 animate-fade-in border border-blue-700">
        <span className="font-semibold flex-1">Dokończ konfigurację konta</span>
        <Button size="sm" variant="secondary" className="ml-2" onClick={() => setOpen(true)}>
          Otwórz
        </Button>
      </div>
    );
  }

  // Expanded widget
  return (
    <div
      className={mode === 'popup'
        ? "fixed z-50 bottom-6 right-6 max-w-xs w-full bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-blue-100 dark:border-blue-900 p-6 animate-fade-in flex flex-col relative"
        : "w-full max-w-md mx-auto bg-white dark:bg-neutral-800 rounded-2xl border border-blue-100 dark:border-blue-900 p-6 flex flex-col mb-6"}
      style={mode === 'popup' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' } : {}}
    >
      {mode === 'popup' && (
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-white dark:bg-neutral-800 rounded-full p-1 shadow"
          aria-label="Zamknij"
          onClick={() => setOpen(false)}
          style={{ zIndex: 2 }}
        >
          <X className="h-5 w-5" />
        </button>
      )}
      <div className="flex items-center mb-3 mt-2">
        <CheckCircle2 className="h-6 w-6 text-blue-600 mr-2" />
        <span className="font-semibold text-blue-700 dark:text-blue-300 text-base">Dokończ konfigurację konta</span>
      </div>
      <ul className="mb-4 space-y-2">
        {steps.map((step, idx) => (
          <li key={step.key} className="flex items-center text-sm">
            {step.icon}
            <span className="flex-1">{step.label}</span>
            {status[step.key] ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 ml-2" />
            ) : (
              <Circle className="h-5 w-5 text-gray-300 ml-2" />
            )}
          </li>
        ))}
      </ul>
      <Button size="sm" className="w-full" onClick={() => navigate('/welcome')}>
        Dokończ konfigurację konta
      </Button>
    </div>
  );
};

export default AccountOnboardingWidget; 