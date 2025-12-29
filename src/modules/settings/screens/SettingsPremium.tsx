import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Separator } from '@/shared/ui/separator';
import { ArrowLeft, Building2, Check, Shield, Sparkles, Users, CreditCard, Crown } from 'lucide-react';

const PLANS = [
  {
    id: 'jdg',
    name: 'JDG',
    price: '19 zł/miesiąc',
    description: 'Fakturowanie i uproszczona księgowość',
    features: [
      'Nieograniczone faktury',
      'Eksport JPK',
      'Uproszczona kontrola decyzji',
    ],
    accent: 'from-emerald-500/10 to-emerald-300/5 border-emerald-500/30',
  },
  {
    id: 'spolka',
    name: 'Spółka Standard',
    price: '89 zł/miesiąc',
    description: 'Governance i odpowiedzialność dla spółek',
    features: [
      'System uchwał i decyzji',
      'Śledzenie kapitału i aktywów',
      'Ścieżka audytu i powiązanie z wydatkami',
    ],
    badge: 'Najpopularniejszy',
    accent: 'from-amber-500/10 to-amber-300/5 border-amber-500/30',
  },
];

const SettingsPremium = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { isPremium, openPremiumDialog } = useAuth();

  const activeProfile = profiles.find((profile) => profile.id === selectedProfileId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
          <CreditCard className="h-4 w-4" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Konto</p>
          <h1 className="text-2xl font-semibold">Plan usługi</h1>
          <p className="text-muted-foreground">
            Zarządzaj subskrypcją dla swoich podmiotów prawnych.
          </p>
        </div>
      </div>

      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <Crown className="h-4 w-4 text-primary" />
              Status subskrypcji
            </Badge>
            {isPremium ? (
              <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                Premium aktywne
              </Badge>
            ) : (
              <Badge variant="destructive">Plan podstawowy</Badge>
            )}
          </div>
          <CardTitle className="text-xl mt-3">
            {activeProfile
              ? `Obecny podmiot: ${activeProfile.name}`
              : 'Wybierz firmę, aby aktywować plan'}
          </CardTitle>
          <CardDescription>
            Jednostką rozliczeń jest podmiot prawny, nie użytkownik. Każda firma może mieć własny plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Nieograniczona liczba użytkowników
            </div>
            <div className="inline-flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Pełny dostęp do modułów systemu
            </div>
          </div>
          <Separator />
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => openPremiumDialog('spolka')}>
              {isPremium ? 'Zarządzaj subskrypcją' : 'Aktywuj plan premium'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/premium')}>
              Zobacz stronę ofertową
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`border ${plan.accent} bg-gradient-to-br shadow-sm`}
          >
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {plan.name}
                  {plan.badge && (
                    <Badge variant="secondary" className="text-xs bg-amber-500/80 text-white">
                      {plan.badge}
                    </Badge>
                  )}
                </CardTitle>
                <span className="text-sm font-medium text-muted-foreground">{plan.price}</span>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => openPremiumDialog(plan.id)}>
                  Kup dla tej firmy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/premium/plan/${plan.id}`)}
                >
                  Szczegóły
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dlaczego 89 zł dla spółek to uczciwa cena?</CardTitle>
          <CardDescription>Porównanie z realnymi kosztami odpowiedzialności.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-muted-foreground">Biuro księgowe</p>
            <p className="text-2xl font-semibold">500-2000 zł</p>
            <p className="text-muted-foreground text-xs">miesięcznie</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-muted-foreground">Audyt</p>
            <p className="text-2xl font-semibold">5000+ zł</p>
            <p className="text-muted-foreground text-xs">rocznie</p>
          </div>
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-muted-foreground">Błędy prawne</p>
            <p className="text-2xl font-semibold">???</p>
            <p className="text-muted-foreground text-xs">niepoliczalne ryzyko</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted">
        <CardContent className="py-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">7 dni trialu dla każdej nowej spółki</p>
              <p className="text-sm text-muted-foreground">
                Bez karty. Pełny dostęp. Decyzja po stronie zarządu.
              </p>
            </div>
          </div>
          <div>
            <Button onClick={() => openPremiumDialog('spolka')}>
              Rozpocznij darmowy okres próbny
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPremium;
