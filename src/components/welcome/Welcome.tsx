import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BusinessProfileForm from '@/pages/settings/BusinessProfileForm';
import {
  Building2,
  Users,
  Package,
  FileText,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import OnboardingCustomerForm from './OnboardingCustomerForm';
import OnboardingProductForm from './OnboardingProductForm';
import OnboardingProfileForm from './OnboardingProfileForm';
import StepNavigation from './StepNavigation';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Onboarding wizard for a new account. The flow contains the following steps:
 * 0. Welcome screen
 * 1. User profile details
 * 2. Business profile
 * 3. First customer
 * 4. First product / service
 * 5. First invoice shortcut
 * 6. Done 🎉
 */
const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  /** Existing business profiles (used to decide whether to skip step 2). */
  const {
    data: profiles = [],
    isLoading: loadingProfiles,
  } = useQuery({
    queryKey: ['businessProfiles', user?.id],
    queryFn: () => (user ? getBusinessProfiles(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  /* --------------------------------------------------
   * LOCAL STATE
   * -------------------------------------------------- */
  const [step, setStep] = useState(0);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);
  const [hasClient, setHasClient] = useState(false);
  const [hasProduct, setHasProduct] = useState(false);

  // Mark business profile as completed when the query returns data
  useEffect(() => {
    if (profiles.length > 0) {
      setHasBusinessProfile(true);
    }
  }, [profiles]);

  /* --------------------------------------------------
   * STEP DEFINITIONS
   * -------------------------------------------------- */
  const steps = [
    /* -------------------------------------------------- 0. WELCOME */
    {
      title: 'Witamy w KsiegaI!',
      icon: <Star className="h-8 w-8 text-amber-500 mb-4" />,
      content: (
        <>
          <p className="mb-8 text-lg text-gray-700 dark:text-gray-200">
            Przeprowadzimy Cię przez szybkie kroki, aby skonfigurować konto i
            zacząć wystawiać faktury.
          </p>
          <Button onClick={() => setStep(hasBusinessProfile ? 3 : 1)}>
            Rozpocznij konfigurację
          </Button>
        </>
      ),
    },

    /* -------------------------------------------------- 1. PROFILE */
    {
      title: 'Uzupełnij dane profilu',
      icon: <Star className="h-8 w-8 text-amber-500 mb-4" />,
      content: (
        <>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            Podaj swoje dane osobowe, aby spersonalizować konto.
          </p>
          <OnboardingProfileForm onSuccess={() => setStep(2)} />
          <StepNavigation
            canGoBack
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={false}
            onSkip={() => setStep(2)}
          />
        </>
      ),
    },

    /* -------------------------------------------------- 2. BUSINESS */
    {
      title: 'Dodaj firmę',
      icon: <Building2 className="h-8 w-8 text-blue-600 mb-4" />,
      content: (
        <>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            Podaj NIP, aby pobrać dane automatycznie. Jeśli nie znajdziemy firmy,
            uzupełnij dane ręcznie.
          </p>
          <BusinessProfileForm
            onSuccess={async () => {
              await queryClient.invalidateQueries({
                queryKey: ['businessProfiles', user?.id],
              });
              setHasBusinessProfile(true);
              setStep(3);
            }}
          />
          <StepNavigation
            canGoBack
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!hasBusinessProfile}
            onSkip={() => setStep(3)}
          />
        </>
      ),
    },

    /* -------------------------------------------------- 3. CLIENT */
    {
      title: 'Dodaj klienta',
      icon: <Users className="h-8 w-8 text-green-600 mb-4" />,
      content: (
        <>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            Dodaj klienta, aby szybko wystawiać faktury i mieć porządek w
            kontaktach.
          </p>
          <OnboardingCustomerForm onSuccess={() => setHasClient(true)} />
          <StepNavigation
            canGoBack
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextDisabled={!hasClient}
            onSkip={() => setStep(4)}
          />
        </>
      ),
    },

    /* -------------------------------------------------- 4. PRODUCT */
    {
      title: 'Dodaj produkt lub usługę',
      icon: <Package className="h-8 w-8 text-purple-600 mb-4" />,
      content: (
        <>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            Dodaj produkty lub usługi, aby szybciej wystawiać faktury.
          </p>
          <OnboardingProductForm
            onSuccess={() => setHasProduct(true)}
            onSkip={() => setStep(5)}
          />
          <StepNavigation
            canGoBack
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextDisabled={!hasProduct}
            onSkip={() => setStep(5)}
          />
        </>
      ),
    },

    /* -------------------------------------------------- 5. FIRST INVOICE */
    {
      title: 'Wystaw pierwszą fakturę',
      icon: <FileText className="h-8 w-8 text-orange-500 mb-4" />,
      content: (
        <>
          <p className="mb-4 text-gray-700 dark:text-gray-200">
            Możesz już wystawić swoją pierwszą fakturę! Wszystkie dane są
            gotowe.
          </p>
          <Button className="mb-6" onClick={() => navigate('/income/new')}>
            Wystaw fakturę
          </Button>
          <StepNavigation
            canGoBack
            onBack={() => setStep(4)}
            onNext={() => setStep(6)}
            nextDisabled={false}
          />
        </>
      ),
    },

    /* -------------------------------------------------- 6. DONE */
    {
      title: 'Konto gotowe!',
      icon: <CheckCircle2 className="h-8 w-8 text-green-500 mb-4" />,
      content: (
        <>
          <h2 className="text-xl font-semibold mb-2">Gratulacje!</h2>
          <p className="mb-6 text-gray-700 dark:text-gray-200">
            Twoje konto jest gotowe do pracy. Możesz korzystać z pełni możliwości
            KsiegaI.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Przejdź do aplikacji</Button>
        </>
      ),
    },
  ];

  /* --------------------------------------------------
   * RENDER HELPERS
   * -------------------------------------------------- */
  const Stepper = () => {
    if (isMobile) {
      // Progress bar for small screens
      const progressPercent = (step / (steps.length - 1)) * 100;
      return (
        <div className="w-full mb-6 px-4">
          <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      );
    }

    // Full step circles for desktop/tablet
    return (
      <div className="flex items-center justify-center gap-4 mb-6">
        {steps.map((_, i) => (
          <React.Fragment key={i}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base border-2 transition-all duration-200
                ${i === step ? 'bg-blue-600 text-white border-blue-600 scale-110 shadow-lg' : i < step ? 'bg-green-500 text-white border-green-500' : 'bg-gray-200 text-gray-500 border-gray-300'}`}
            >
              {i + 1}
            </div>
            {i < steps.length - 1 && <div className="w-10 h-1 bg-gray-300 mx-1 rounded" />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  /* --------------------------------------------------
   * RENDER
   * -------------------------------------------------- */
  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-10 max-w-lg w-full text-center">
          <span className="text-2xl font-bold">Ładowanie...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 p-4">
      {step < steps.length - 1 && (
        <div className="w-full max-w-lg flex flex-col items-center mb-4">
          <Stepper />
          <div className="flex w-full justify-between items-center px-2">
            <span className="text-xs text-gray-500">
              Krok {step + 1} z {steps.length}
            </span>
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => navigate('/dashboard')}
            >
              Pomiń konfigurację
            </button>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl p-10 max-w-lg w-full flex flex-col items-center text-center">
        {steps[step].icon}
        <h1 className="text-2xl font-bold mb-6">{steps[step].title}</h1>
        {steps[step].content}
      </div>
    </div>
  );
};

export default Welcome;
