import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/context/AuthContext';
import { subscriptionService, type EnterprisePricing, type CompanyInfo } from '@/shared/services/subscriptionService';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Crown, Building2, Users, Check, ArrowRight, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const EnhancedPremium: React.FC = () => {
  const { user, openPremiumDialog } = useAuth();
  const [companies, setCompanies] = useState<CompanyInfo[]>([]);
  const [enterprisePricing, setEnterprisePricing] = useState<EnterprisePricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch currency settings
  const { data: currencySettings } = useQuery({
    queryKey: ['currency-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('currency, currency_symbol, blik_enabled')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const formatPrice = (amount: number) => {
    const currency = currencySettings?.currency || 'EUR';
    const locale = currency === 'PLN' ? 'pl-PL' : 'de-DE';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [companiesData, pricingData] = await Promise.all([
        subscriptionService.getUserCompanies(user.id),
        subscriptionService.calculateEnterprisePricing(user.id)
      ]);
      
      setCompanies(companiesData);
      setEnterprisePricing(pricingData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeDisplay = (entityType: string) => {
    switch (entityType) {
      case 'dzialalnosc': return 'JDG';
      case 'sp_zoo': return 'Sp. z o.o.';
      case 'sa': return 'S.A.';
      default: return entityType;
    }
  };

  const subscriptionPlans = [
    {
      id: 'jdg',
      name: 'JDG Premium',
      subtitle: 'Dla jednoosobowych działalności',
      price: 19,
      annualPrice: 190,
      icon: Building2,
      color: 'from-blue-500 to-blue-600',
      features: [
        'Nieograniczone faktury i dokumenty',
        'Podstawowa księgowość',
        'Eksport JPK',
        'KSeF integracja',
        'Podatki i ZUS'
      ],
      entityType: 'dzialalnosc'
    },
    {
      id: 'spolka',
      name: 'Spółka Standard',
      subtitle: 'Pełny system governance',
      price: 89,
      annualPrice: 890,
      icon: Crown,
      color: 'from-amber-500 to-amber-600',
      features: [
        'Wszystko z planu JDG',
        'System uchwał i decyzji',
        'Zarządzanie aktywami',
        'Ścieżka audytu',
        'Śledzenie kapitału',
        'Governance workflows'
      ],
      entityType: 'sp_zoo'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Wszystkie Twoje firmy premium',
      price: null,
      annualPrice: null,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      features: [
        'Premium dla wszystkich firm',
        'Dynamiczne rozliczenie',
        'Automatyczne przydzielanie',
        'Priorytetowe wsparcie',
        'Zaawansowane analityki'
      ],
      badge: 'Najlepsza wartość'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 flex items-center justify-center">
        <div className="text-white">Ładowanie...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-full w-16 h-16 shadow-xl mb-6">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Wybierz plan premium dla Twojej firmy
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            Płać tylko za to, czego potrzebujesz. Indywidualne plany dla każdej firmy lub enterprise dla wszystkich.
          </p>
        </header>

        {/* Current Companies Overview */}
        {companies.length > 0 && (
          <section className="max-w-4xl mx-auto mb-12">
            <Card className="bg-neutral-900/60 border-neutral-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Twoje firmy ({companies.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {companies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-neutral-400">
                          {getEntityTypeDisplay(company.entity_type)} • NIP: {company.tax_id}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-neutral-600">
                        {getEntityTypeDisplay(company.entity_type)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Subscription Plans */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Wybierz plan subskrypcji</h2>
            <p className="text-neutral-400">Dopasuj plan do swoich potrzeb</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {subscriptionPlans.map((plan) => {
              const Icon = plan.icon;
              const isEnterprise = plan.id === 'enterprise';
              const currentPrice = isEnterprise && enterprisePricing 
                ? enterprisePricing.total_monthly_price 
                : plan.price ? plan.price * 100 : null;

              return (
                <Card
                  key={plan.id}
                  className={`relative bg-neutral-900/60 border-neutral-800 text-white transition-all hover:scale-105 ${
                    plan.id === 'enterprise' ? 'ring-2 ring-purple-500/50' : ''
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-purple-500 text-white border-purple-400">
                        {plan.badge}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <p className="text-sm text-neutral-400">{plan.subtitle}</p>
                      </div>
                    </div>

                    <div className="border-t border-neutral-700 pt-4">
                      {isEnterprise && enterprisePricing ? (
                        <div className="space-y-2">
                          <div className="text-3xl font-extrabold">
                            {formatPrice(currentPrice!)} zł
                            <span className="text-sm font-medium text-neutral-300">/miesiąc</span>
                          </div>
                          <div className="text-xs text-neutral-400 space-y-1">
                            <p>Base: {formatPrice(enterprisePricing.base_price)} zł</p>
                            <p>{enterprisePricing.jdg_count} × JDG: {formatPrice(enterprisePricing.per_jdg_price * enterprisePricing.jdg_count)} zł</p>
                            <p>{enterprisePricing.spolka_count} × Spółka: {formatPrice(enterprisePricing.per_spolka_price * enterprisePricing.spolka_count)} zł</p>
                          </div>
                          <p className="text-xs text-emerald-400">
                            {enterprisePricing.company_count} firm w planie enterprise
                          </p>
                        </div>
                      ) : plan.price ? (
                        <div>
                          <div className="text-3xl font-extrabold">
                            {plan.price} zł
                            <span className="text-sm font-medium text-neutral-300">/miesiąc</span>
                          </div>
                          <p className="text-sm text-neutral-300">
                            lub {plan.annualPrice} zł/rok (oszczędzasz 2 miesiące)
                          </p>
                        </div>
                      ) : (
                        <div className="text-2xl font-extrabold">Cena dynamiczna</div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5 mt-0.5">
                            <Check className="h-4 w-4 text-emerald-400" />
                          </div>
                          <p className="text-sm text-neutral-200">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-2">
                      {isEnterprise ? (
                        <Button
                          className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90`}
                          onClick={() => openPremiumDialog('enterprise')}
                        >
                          Aktywuj Enterprise
                          <Sparkles className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <>
                          <Link to={`/premium/plan/${plan.id}`}>
                            <Button className="w-full" variant="outline">
                              Szczegóły planu
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                          <Button
                            className={`w-full bg-gradient-to-r ${plan.color} hover:opacity-90`}
                            onClick={() => openPremiumDialog(plan.id)}
                          >
                            Wybierz firmę i kup
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Enterprise Benefits Explanation */}
        <section className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-br from-purple-900/40 to-neutral-900/60 border-purple-500/30">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-3">Dlaczego Enterprise?</h3>
                <p className="text-neutral-300">Jeden plan dla wszystkich Twoich firm</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-400">Zarządzanie</h4>
                  <ul className="space-y-2 text-sm text-neutral-200">
                    <li>• Automatyczne premium dla nowych firm</li>
                    <li>• Jedna faktura za wszystko</li>
                    <li>• Centralne zarządzanie subskrypcją</li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-purple-400">Korzyści</h4>
                  <ul className="space-y-2 text-sm text-neutral-200">
                    <li>• Lepsza cena przy wielu firmach</li>
                    <li>• Priorytetowe wsparcie</li>
                    <li>• Zaawansowane funkcje</li>
                  </ul>
                </div>
              </div>

              {enterprisePricing && (
                <div className="border-t border-neutral-700 pt-6 text-center">
                  <p className="text-sm text-neutral-300">
                    <span className="font-semibold text-white">
                      Twoja cena Enterprise: {formatPrice(enterprisePricing.total_monthly_price)}/miesiąc
                    </span>
                    <br />
                    <span className="text-xs text-neutral-400">
                      vs {enterprisePricing.jdg_count} × {formatPrice(currencySettings?.currency === 'EUR' ? 500 : 1900)} + {enterprisePricing.spolka_count} × {formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)} = 
                      {' '}{formatPrice(currencySettings?.currency === 'EUR' 
                        ? enterprisePricing.jdg_count * 500 + enterprisePricing.spolka_count * 2100
                        : enterprisePricing.jdg_count * 1900 + enterprisePricing.spolka_count * 8900)}/miesiąc
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Gotowy na premium?</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Wybierz plan idealny dla Twojej sytuacji. Indywidualne firmy lub enterprise dla wszystkich.
            </p>
          </div>
          
          {!user ? (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="px-8 text-lg">
                  Załóż konto i zacznij
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="outline" size="lg" className="px-8 text-lg border-neutral-600">
                  Mam już konto
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 text-lg"
              onClick={() => openPremiumDialog()}
            >
              Zarządzaj subskrypcją
              <Crown className="h-5 w-5 ml-2" />
            </Button>
          )}
        </section>
      </div>
    </div>
  );
};

export default EnhancedPremium;
