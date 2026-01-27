import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Building, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import BusinessProfileForm from './BusinessProfileForm';
import SpoolkaWizard from '@/modules/onboarding/components/wizard/SpoolkaWizard';
import { JDGWizard } from '@/modules/onboarding/components/wizard/JDGWizard';
import { useAuth } from '@/shared/hooks/useAuth';

const NewBusinessProfile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectProfile } = useBusinessProfile();
  const [mode, setMode] = useState<'choose' | 'jdg' | 'sp_zoo' | 'sa'>('choose');

  const modeStorageKey = user?.id ? `onboarding:newBusinessProfile:mode:${user.id}` : null;

  useEffect(() => {
    if (!modeStorageKey) return;
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem(modeStorageKey);

    // If user was in the middle of a spółka wizard, resume it automatically.
    // This is intentionally checked BEFORE applying raw mode, because a full remount
    // may reset mode to 'choose' while the wizard draft still exists.
    const hasSpZooDraft = !!localStorage.getItem(`onboarding:spoolka:${user.id}:sp_zoo`);
    const hasSaDraft = !!localStorage.getItem(`onboarding:spoolka:${user.id}:sa`);
    if (hasSpZooDraft) {
      setMode('sp_zoo');
      return;
    }
    if (hasSaDraft) {
      setMode('sa');
      return;
    }

    if (raw === 'choose' || raw === 'jdg' || raw === 'sp_zoo' || raw === 'sa') {
      setMode(raw);
      return;
    }
  }, [modeStorageKey, user?.id]);

  useEffect(() => {
    if (!modeStorageKey) return;
    if (typeof window === 'undefined') return;
    localStorage.setItem(modeStorageKey, mode);
  }, [modeStorageKey, mode]);

  const handleComplete = (profileId: string) => {
    selectProfile(profileId);

    if (modeStorageKey && typeof window !== 'undefined') {
      localStorage.removeItem(modeStorageKey);
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {mode === 'choose' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-4xl space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Utwórz nowy profil firmy
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Wybierz typ działalności, a my dopasujemy kreator do Twoich potrzeb
              </p>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                type="button"
                onClick={() => setMode('jdg')}
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
              </button>

              <button
                type="button"
                onClick={() => setMode('sp_zoo')}
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
              </button>

              <button
                type="button"
                onClick={() => setMode('sa')}
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
              </button>
            </div>

            {/* Footer hint */}
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/settings/business-profiles')}
                className="text-muted-foreground hover:text-foreground"
              >
                Powrót do ustawień
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === 'jdg' && (
        <div className="min-h-screen">
          <JDGWizard
            onCancel={() => setMode('choose')}
            onComplete={handleComplete}
          />
        </div>
      )}

      {(mode === 'sp_zoo' || mode === 'sa') && (
        <div className="min-h-screen">
          <SpoolkaWizard
            initialCompanyType={mode}
            onCancel={() => setMode('choose')}
            onComplete={handleComplete}
          />
        </div>
      )}
    </div>
  );
};

export default NewBusinessProfile;
