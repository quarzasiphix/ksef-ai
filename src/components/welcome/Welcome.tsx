import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BusinessProfileForm from '@/pages/settings/BusinessProfileForm';
import SpoolkaWizard from '@/components/wizard/SpoolkaWizard';
import {
  Building2,
  Building,
  Users,
  User,
  Package,
  CheckCircle2,
  Star,
  ArrowRight,
  Mail,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import { getPendingInvitations, acceptInvitation, declineInvitation, CompanyInvitation } from '@/integrations/supabase/repositories/invitationRepository';
import OnboardingCustomerForm, { OnboardingCustomerFormHandle } from './OnboardingCustomerForm';
import OnboardingProductForm, { OnboardingProductFormHandle } from './OnboardingProductForm';
import OnboardingProfileForm, { OnboardingProfileFormHandle } from './OnboardingProfileForm';
import StepNavigation from './StepNavigation';
import { BankAccountEditDialog } from '@/components/bank/BankAccountEditDialog';
import { getBankAccountsForProfile, addBankAccount } from '@/integrations/supabase/repositories/bankAccountRepository';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { motion } from 'framer-motion';

type WizardMode = 'welcome' | 'invitations' | 'choose-type' | 'jdg' | 'sp_zoo' | 'sa' | 'profile' | 'bank' | 'customer' | 'product' | 'complete';

const Welcome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectProfile } = useBusinessProfile();

  // Fetch business profiles
  const {
    data: profiles = [],
    isLoading: loadingProfiles,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ['businessProfiles', user?.id],
    queryFn: () => (user ? getBusinessProfiles(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  // Fetch pending invitations
  const {
    data: pendingInvitations = [],
    isLoading: loadingInvitations,
    refetch: refetchInvitations,
  } = useQuery({
    queryKey: ['pendingInvitations', user?.id],
    queryFn: getPendingInvitations,
    enabled: !!user,
  });

  const [mode, setMode] = useState<WizardMode>('welcome');
  const [createdProfileId, setCreatedProfileId] = useState<string | null>(null);
  const [bankStepAccounts, setBankStepAccounts] = useState<any[]>([]);
  const [showAddBankDialogStep, setShowAddBankDialogStep] = useState(false);
  const [acceptingInvitation, setAcceptingInvitation] = useState<string | null>(null);

  const profileFormRef = useRef<OnboardingProfileFormHandle>(null);
  const customerFormRef = useRef<OnboardingCustomerFormHandle>(null);
  const productFormRef = useRef<OnboardingProductFormHandle>(null);

  // Determine initial mode based on state
  useEffect(() => {
    if (loadingProfiles || loadingInvitations) return;

    // If user has pending invitations, show them first
    if (pendingInvitations.length > 0 && mode === 'welcome') {
      setMode('invitations');
      return;
    }

    // If user already has a business profile, skip to later steps
    if (profiles.length > 0 && mode === 'welcome') {
      setCreatedProfileId(profiles[0].id);
      setMode('profile');
    }
  }, [loadingProfiles, loadingInvitations, pendingInvitations.length, profiles.length, mode]);

  // Fetch bank accounts when on bank step
  useEffect(() => {
    const profileId = createdProfileId || profiles[0]?.id;
    if (mode === 'bank' && profileId) {
      getBankAccountsForProfile(profileId)
        .then((accounts) => setBankStepAccounts(accounts))
        .catch(() => toast.error('Błąd ładowania kont bankowych'));
    }
  }, [mode, createdProfileId, profiles]);

  const currentProfile = profiles.find(p => p.id === createdProfileId) || profiles[0];
  const isVatExempt = currentProfile?.is_vat_exempt;

  // Handle company creation completion
  const handleCompanyCreated = (profileId: string) => {
    setCreatedProfileId(profileId);
    selectProfile(profileId);
    queryClient.invalidateQueries({ queryKey: ['businessProfiles'] });
    refetchProfiles();
    setMode('profile');
  };

  // Handle invitation acceptance
  const handleAcceptInvitation = async (invitation: CompanyInvitation) => {
    setAcceptingInvitation(invitation.id);
    try {
      const result = await acceptInvitation(invitation.token);
      if (result.success) {
        toast.success(`Dołączyłeś do firmy ${invitation.business_profile?.name}`);
        await refetchInvitations();
        await refetchProfiles();
        if (result.business_profile_id) {
          selectProfile(result.business_profile_id);
        }
        // If no more invitations, proceed
        if (pendingInvitations.length <= 1) {
          setMode('complete');
        }
      } else {
        toast.error(result.error || 'Nie udało się zaakceptować zaproszenia');
      }
    } catch (error) {
      toast.error('Wystąpił błąd');
    } finally {
      setAcceptingInvitation(null);
    }
  };

  // Handle invitation decline
  const handleDeclineInvitation = async (invitation: CompanyInvitation) => {
    const success = await declineInvitation(invitation.id);
    if (success) {
      toast.info('Zaproszenie odrzucone');
      await refetchInvitations();
      // If no more invitations, proceed to company creation
      if (pendingInvitations.length <= 1) {
        if (profiles.length > 0) {
          setMode('profile');
        } else {
          setMode('choose-type');
        }
      }
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'accountant': return 'Księgowy';
      case 'pelnomocnik': return 'Pełnomocnik';
      case 'viewer': return 'Podgląd';
      default: return role;
    }
  };

  // Loading state
  if (loadingProfiles || loadingInvitations) {
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

  // Render based on mode
  const renderContent = () => {
    switch (mode) {
      // Welcome screen
      case 'welcome':
        return (
          <div className="flex flex-col items-center text-center">
            <Star className="h-12 w-12 text-amber-400 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Witamy w KsięgaI!</h1>
            <p className="mb-8 text-lg text-muted-foreground max-w-md">
              Przeprowadzimy Cię przez kilka szybkich kroków, aby skonfigurować Twoje konto i przygotować do wystawiania faktur.
            </p>
            <Button size="lg" onClick={() => setMode('choose-type')}>
              Rozpocznij konfigurację
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        );

      // Pending invitations
      case 'invitations':
        return (
          <div className="flex flex-col items-center text-center w-full">
            <Mail className="h-12 w-12 text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Masz zaproszenia!</h1>
            <p className="mb-6 text-muted-foreground max-w-md">
              Zostałeś zaproszony do współpracy z następującymi firmami. Możesz zaakceptować zaproszenie lub utworzyć własną firmę.
            </p>
            
            <div className="w-full max-w-lg space-y-4 mb-6">
              {pendingInvitations.map((invitation) => (
                <Card key={invitation.id} className="text-left">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{invitation.business_profile?.name}</CardTitle>
                      <Badge variant="secondary">{getRoleLabel(invitation.role)}</Badge>
                    </div>
                    <CardDescription>
                      NIP: {invitation.business_profile?.tax_id}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {invitation.message && (
                      <p className="text-sm text-muted-foreground mb-4 italic">"{invitation.message}"</p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleAcceptInvitation(invitation)}
                        disabled={acceptingInvitation === invitation.id}
                        className="flex-1"
                      >
                        {acceptingInvitation === invitation.id ? 'Akceptowanie...' : 'Akceptuj'}
                        <CheckCircle2 className="ml-2 h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDeclineInvitation(invitation)}
                        disabled={acceptingInvitation === invitation.id}
                      >
                        Odrzuć
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="border-t pt-6 w-full max-w-lg">
              <p className="text-sm text-muted-foreground mb-4">Lub utwórz własną firmę:</p>
              <Button variant="outline" onClick={() => setMode('choose-type')} className="w-full">
                <Building2 className="mr-2 h-4 w-4" />
                Utwórz nową firmę
              </Button>
            </div>
          </div>
        );

      // Choose company type
      case 'choose-type':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-4xl space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-center space-y-3"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Dodaj firmę</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Wybierz typ działalności, a my dopasujemy kreator do Twoich potrzeb
                </p>
              </motion.div>

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <motion.button
                  type="button"
                  onClick={() => setMode('jdg')}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="group relative text-left rounded-2xl border-2 border-border bg-card p-8 hover:border-primary hover:shadow-lg transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <User className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xl font-bold">JDG</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        Jednoosobowa działalność gospodarcza
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Rozpocznij <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setMode('sp_zoo')}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="group relative text-left rounded-2xl border-2 border-border bg-card p-8 hover:border-primary hover:shadow-lg transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors">
                      <Building2 className="h-7 w-7 text-purple-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xl font-bold">Sp. z o.o.</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        Spółka z ograniczoną odpowiedzialnością
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Rozpocznij <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setMode('sa')}
                  variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="group relative text-left rounded-2xl border-2 border-border bg-card p-8 hover:border-primary hover:shadow-lg transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                      <Building className="h-7 w-7 text-emerald-600" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xl font-bold">S.A.</div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        Spółka akcyjna
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Rozpocznij <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </motion.button>
              </motion.div>

              {pendingInvitations.length > 0 && (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => setMode('invitations')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Wróć do zaproszeń ({pendingInvitations.length})
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      // JDG form
      case 'jdg':
        return (
          <div className="w-full">
            <BusinessProfileForm
              lockedEntityType="dzialalnosc"
              onCancel={() => setMode('choose-type')}
              onComplete={handleCompanyCreated}
            />
          </div>
        );

      // Spółka z o.o. wizard
      case 'sp_zoo':
        return (
          <div className="w-full">
            <SpoolkaWizard
              initialCompanyType="sp_zoo"
              onCancel={() => setMode('choose-type')}
              onComplete={handleCompanyCreated}
            />
          </div>
        );

      // S.A. wizard
      case 'sa':
        return (
          <div className="w-full">
            <SpoolkaWizard
              initialCompanyType="sa"
              onCancel={() => setMode('choose-type')}
              onComplete={handleCompanyCreated}
            />
          </div>
        );

      // User profile
      case 'profile':
        return (
          <div className="flex flex-col items-center text-center w-full">
            <Users className="h-10 w-10 text-sky-500 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Uzupełnij swój profil</h1>
            <p className="mb-6 text-muted-foreground max-w-md">
              Podaj swoje dane, abyśmy mogli spersonalizować Twoje doświadczenie w aplikacji.
            </p>
            <OnboardingProfileForm
              ref={profileFormRef}
              onSuccess={() => setMode('bank')}
            />
            <div className="w-full max-w-lg mt-8">
              <StepNavigation
                canGoBack={false}
                onNext={() => profileFormRef.current?.submit()}
                nextLabel="Zapisz i kontynuuj"
                onSkip={() => setMode('bank')}
              />
            </div>
          </div>
        );

      // Bank accounts
      case 'bank':
        return (
          <div className="flex flex-col items-center text-center w-full">
            <Building2 className="h-10 w-10 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Dodaj konta bankowe</h1>
            <p className="mb-6 text-muted-foreground max-w-md">
              Dodaj konta bankowe swojej firmy. {isVatExempt === false ? 'Jeśli jesteś VAT-owcem, zalecamy dodanie konta VAT.' : ''}
            </p>
            <div className="flex flex-col gap-2 items-center w-full max-w-md">
              {bankStepAccounts.map((acc: any) => (
                <div key={acc.id} className="w-full border rounded p-3 flex flex-col items-start text-left">
                  <div className="font-semibold">{acc.accountName || acc.bankName}</div>
                  <div className="text-xs text-muted-foreground">{acc.accountNumber}</div>
                  <div className="text-xs text-muted-foreground">{acc.currency} {acc.type === 'vat' ? '(VAT)' : ''}</div>
                </div>
              ))}
              <Button variant="outline" className="mt-2" onClick={() => setShowAddBankDialogStep(true)}>
                Dodaj konto bankowe
              </Button>
              {showAddBankDialogStep && currentProfile && (
                <BankAccountEditDialog
                  trigger={null}
                  open={showAddBankDialogStep}
                  onOpenChange={setShowAddBankDialogStep}
                  onSave={async (data) => {
                    await addBankAccount({ ...data, businessProfileId: currentProfile.id, connectedAt: new Date().toISOString() });
                    const updated = await getBankAccountsForProfile(currentProfile.id);
                    setBankStepAccounts(updated);
                    setShowAddBankDialogStep(false);
                  }}
                />
              )}
              {isVatExempt === false && !bankStepAccounts.some((a: any) => a.type === 'vat') && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 text-left">
                  <b>Rekomendacja:</b> Dodaj konto VAT, aby korzystać z podzielonej płatności (split payment).
                </div>
              )}
            </div>
            <div className="w-full max-w-lg mt-8">
              <StepNavigation
                canGoBack={true}
                onBack={() => setMode('profile')}
                onNext={() => setMode('customer')}
                nextLabel="Dalej"
                onSkip={() => setMode('customer')}
              />
            </div>
          </div>
        );

      // Customer
      case 'customer':
        return (
          <div className="flex flex-col items-center text-center w-full">
            <UserPlus className="h-10 w-10 text-green-600 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Dodaj pierwszego klienta</h1>
            <p className="mb-6 text-muted-foreground max-w-md">
              Dodaj kontrahenta, aby móc szybko wystawiać mu faktury.
            </p>
            <OnboardingCustomerForm
              ref={customerFormRef}
              onSuccess={() => setMode('product')}
            />
            <div className="w-full max-w-lg mt-8">
              <StepNavigation
                canGoBack={true}
                onBack={() => setMode('bank')}
                onNext={() => customerFormRef.current?.submit()}
                nextLabel="Dodaj i przejdź dalej"
                onSkip={() => setMode('product')}
              />
            </div>
          </div>
        );

      // Product
      case 'product':
        return (
          <div className="flex flex-col items-center text-center w-full">
            <Package className="h-10 w-10 text-purple-600 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Dodaj produkt lub usługę</h1>
            <p className="mb-6 text-muted-foreground max-w-md">
              Stwórz pozycje, które będą pojawiać się na Twoich fakturach.
            </p>
            <OnboardingProductForm
              ref={productFormRef}
              onSuccess={() => setMode('complete')}
            />
            <div className="w-full max-w-lg mt-8">
              <StepNavigation
                canGoBack={true}
                onBack={() => setMode('customer')}
                onNext={() => productFormRef.current?.submit()}
                nextLabel="Dodaj i zakończ"
                onSkip={() => setMode('complete')}
              />
            </div>
          </div>
        );

      // Complete
      case 'complete':
        return (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h1 className="text-3xl font-bold tracking-tight mb-2">Konto gotowe!</h1>
            <p className="mb-8 text-lg text-muted-foreground max-w-md">
              Gratulacje! Twoje konto jest gotowe do pracy. Możesz już w pełni korzystać z KsięgaI.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white" onClick={() => navigate('/premium')}>
                Wypróbuj 7-dniowy trial
                <Star className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/income/new')}>
                Wystaw pierwszą fakturę
              </Button>
              <Button size="lg" onClick={() => navigate('/dashboard')}>
                Przejdź do pulpitu
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Calculate progress for progress bar
  const getProgress = () => {
    const progressSteps: WizardMode[] = ['profile', 'bank', 'customer', 'product', 'complete'];
    const currentIndex = progressSteps.indexOf(mode);
    if (currentIndex === -1) return 0;
    return ((currentIndex + 1) / progressSteps.length) * 100;
  };

  const showProgressBar = ['profile', 'bank', 'customer', 'product'].includes(mode);

  // For JDG/Spółka wizards and company-type selection, render full-screen
  if (mode === 'jdg' || mode === 'sp_zoo' || mode === 'sa' || mode === 'choose-type') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-2xl mx-auto">
        
        {showProgressBar && (
          <div className="mb-8 px-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-primary">
                Konfiguracja konta
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                Pomiń konfigurację
              </Button>
            </div>
            <div className="w-full bg-gray-200 dark:bg-neutral-800 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-gray-100 dark:border-neutral-800 p-6 sm:p-10 w-full">
          {renderContent()}
        </div>

        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>Dołącz do tysięcy przedsiębiorców, którzy zaufali KsięgaI.</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
