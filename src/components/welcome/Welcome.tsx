
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import BusinessProfileForm from '@/pages/settings/BusinessProfileForm';
import {
  Building2,
  Users,
  Package,
  CheckCircle2,
  Star,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import OnboardingCustomerForm, { OnboardingCustomerFormHandle } from './OnboardingCustomerForm';
import OnboardingProductForm, { OnboardingProductFormHandle } from './OnboardingProductForm';
import OnboardingProfileForm, { OnboardingProfileFormHandle } from './OnboardingProfileForm';
import StepNavigation from './StepNavigation';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: profiles = [],
    isLoading: loadingProfiles,
  } = useQuery({
    queryKey: ['businessProfiles', user?.id],
    queryFn: () => (user ? getBusinessProfiles(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const [step, setStep] = useState(0);
  const [hasBusinessProfile, setHasBusinessProfile] = useState(false);

  const profileFormRef = useRef<OnboardingProfileFormHandle>(null);
  const customerFormRef = useRef<OnboardingCustomerFormHandle>(null);
  const productFormRef = useRef<OnboardingProductFormHandle>(null);

  useEffect(() => {
    if (profiles.length > 0) {
      setHasBusinessProfile(true);
    }
  }, [profiles]);

  const steps = [
    {
      title: 'Witamy w KsiegaI!',
      icon: <Star className="h-10 w-10 text-amber-400 mb-4" />,
      content: (
        <>
          <p className="mb-8 text-lg text-center text-muted-foreground max-w-md">
            Przeprowadzimy Cię przez kilka szybkich kroków, aby skonfigurować Twoje konto i przygotować do wystawiania faktur.
          </p>
          <Button size="lg" onClick={() => setStep(1)}>
            Rozpocznij konfigurację
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </>
      ),
    },
    {
      title: 'Uzupełnij swój profil',
      icon: <Users className="h-10 w-10 text-sky-500 mb-4" />,
      content: (
        <>
          <p className="mb-6 text-center text-muted-foreground max-w-md">
            Podaj swoje dane, abyśmy mogli spersonalizować Twoje doświadczenie w aplikacji.
          </p>
          <OnboardingProfileForm
            ref={profileFormRef}
            onSuccess={() => setStep(2)}
          />
        </>
      ),
      navigation: (
        <StepNavigation
          canGoBack={true}
          onBack={() => setStep(0)}
          onNext={() => profileFormRef.current?.submit()}
          nextLabel="Zapisz i kontynuuj"
          onSkip={() => setStep(2)}
        />
      ),
    },
    {
      title: 'Dodaj dane swojej firmy',
      icon: <Building2 className="h-10 w-10 text-blue-600 mb-4" />,
      content: (
        <>
          <p className="mb-6 text-center text-muted-foreground max-w-md">
            Wprowadź NIP, aby automatycznie pobrać dane z GUS. Możesz też uzupełnić je ręcznie.
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
        </>
      ),
    },
    {
      title: 'Dodaj pierwszego klienta',
      icon: <Users className="h-10 w-10 text-green-600 mb-4" />,
      content: (
        <>
          <p className="mb-6 text-center text-muted-foreground max-w-md">
            Dodaj kontrahenta, aby móc szybko wystawiać mu faktury.
          </p>
          <OnboardingCustomerForm
            ref={customerFormRef}
            onSuccess={() => {
              setStep(4);
            }}
          />
        </>
      ),
      navigation: (
        <StepNavigation
          canGoBack={true}
          onBack={() => setStep(2)}
          onNext={() => customerFormRef.current?.submit()}
          nextLabel="Dodaj i przejdź dalej"
          onSkip={() => setStep(4)}
        />
      ),
    },
    {
      title: 'Dodaj produkt lub usługę',
      icon: <Package className="h-10 w-10 text-purple-600 mb-4" />,
      content: (
        <>
          <p className="mb-6 text-center text-muted-foreground max-w-md">
            Stwórz pozycje, które będą pojawiać się na Twoich fakturach.
          </p>
          <OnboardingProductForm
            ref={productFormRef}
            onSuccess={() => {
              setStep(5);
            }}
          />
        </>
      ),
      navigation: (
        <StepNavigation
          canGoBack={true}
          onBack={() => setStep(3)}
          onNext={() => productFormRef.current?.submit()}
          nextLabel="Dodaj i zakończ"
          onSkip={() => setStep(5)}
        />
      ),
    },
    {
      title: 'Konto gotowe!',
      icon: <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />,
      content: (
        <>
          <p className="mb-8 text-lg text-center text-muted-foreground max-w-md">
            Gratulacje! Twoje konto jest gotowe do pracy. Możesz już w pełni korzystać z KsiegaI.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
             <Button size="lg" variant="outline" onClick={() => navigate('/income/new')}>
              Wystaw pierwszą fakturę
            </Button>
            <Button size="lg" onClick={() => navigate('/dashboard')}>
              Przejdź do pulpitu
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </>
      ),
    },
  ];

  useEffect(() => {
    // Skip business profile step if already exists
    if (step === 2 && hasBusinessProfile) {
      setStep(3);
    }
  }, [step, hasBusinessProfile]);

  if (loadingProfiles) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-950 p-4">
        <div className="text-center">
          <div role="status">
              <svg aria-hidden="true" className="inline w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-primary" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                  <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0492C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z" fill="currentFill"/>
              </svg>
              <span className="sr-only">Ładowanie...</span>
          </div>
        </div>
      </div>
    );
  }

  const currentStepData = steps[step];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto">
        
        {step > 0 && step < steps.length - 1 && (
            <div className="mb-8 px-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-primary">Krok {step} z {steps.length - 2}</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                        Pomiń konfigurację
                    </Button>
                </div>
                <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${(step / (steps.length - 2)) * 100}%` }}
                    />
                </div>
            </div>
        )}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 p-6 sm:p-10 w-full flex flex-col items-center text-center">
            {currentStepData.icon}
            <h1 className="text-3xl font-bold tracking-tight mb-2">{currentStepData.title}</h1>
            <div className="w-full">
              {currentStepData.content}
            </div>

            {currentStepData.navigation && (
                <div className="w-full max-w-lg mt-8">
                    {currentStepData.navigation}
                </div>
            )}
        </div>

        <div className="mt-8 text-center text-muted-foreground text-sm">
            <p>Dołącz do tysięcy przedsiębiorców, którzy zaufali KsiegaI.</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
