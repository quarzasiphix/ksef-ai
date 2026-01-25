import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Loader2, Building2, Check, AlertCircle, CreditCard, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscriptionTypes } from '../hooks/useSubscriptionTypes';
import { PaymentMethodDialog } from './PaymentMethodDialog';
import { BlikPaymentModal } from './BlikPaymentModal';

interface BusinessProfile {
  id: string;
  name: string;
  entity_type: string;
  subscription_tier?: string;
  subscription_status?: string;
}

interface SubscriptionType {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  price_monthly_eur?: number;
  price_annual_eur?: number;
  price_per_business?: number;
  price_per_business_eur?: number;
  uses_tiered_pricing?: boolean;
  features: string[];
}

export const MultiBusinessCheckout: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  const [showBlikModal, setShowBlikModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'blik'>('card');

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

  const { data: businesses, isLoading: loadingBusinesses } = useQuery({
    queryKey: ['user-businesses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, name, entity_type, subscription_tier, subscription_status')
        .eq('user_id', user!.id)
        .order('name');

      if (error) throw error;
      return data as BusinessProfile[];
    },
    enabled: !!user,
  });

  const { data: subscriptionTypes } = useQuery({
    queryKey: ['subscription-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as SubscriptionType[];
    },
  });

  // Auto-select business profile if coming from premium dialog or URL parameter
  useEffect(() => {
    if (!businesses) return;

    // Check URL parameter first (priority)
    const urlBusinessId = searchParams.get('business');
    if (urlBusinessId) {
      const business = businesses.find(b => b.id === urlBusinessId);
      if (business && !hasActiveSubscription(business)) {
        setSelectedBusinesses([urlBusinessId]);
        return;
      }
    }

    // Fallback to sessionStorage
    const storedBusinessId = sessionStorage.getItem('premiumCheckoutBusinessId');
    if (storedBusinessId) {
      const business = businesses.find(b => b.id === storedBusinessId);
      if (business && !hasActiveSubscription(business)) {
        setSelectedBusinesses([storedBusinessId]);
        // Clear the stored ID after using it
        sessionStorage.removeItem('premiumCheckoutBusinessId');
      }
    }
  }, [businesses, searchParams]);

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      // Calculate prorated amount for mid-month billing
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - today.getDate();
      const prorationRatio = daysRemaining / daysInMonth;

      const { data, error } = await supabase.functions.invoke('create-premium-checkout', {
        body: {
          businessProfileIds: selectedBusinesses,
          billingCycle,
          paymentMethod: selectedPaymentMethod,
          prorationRatio, // Send proration info to backend
          isProrated: true, // Flag for prorated billing
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error('Błąd podczas tworzenia płatności', {
        description: error.message,
      });
    },
  });

  const createBlikPaymentMutation = useMutation({
    mutationFn: async () => {
      // For Blik, we create a one-time payment for the first month only
      const monthlyTotal = selectedBusinesses.reduce((total, businessId) => {
        const business = businesses?.find(b => b.id === businessId);
        if (!business) return total;

        const subType = business.entity_type === 'sp_zoo' || business.entity_type === 'sa'
          ? 'spolka'
          : 'jdg';

        const subscriptionType = subscriptionTypes?.find(st => st.name === subType);
        if (!subscriptionType) return total;

        return total + subscriptionType.price_monthly;
      }, 0);

      const { data, error } = await supabase.functions.invoke('create-blik-payment', {
        body: {
          businessProfileIds: selectedBusinesses,
          amount: monthlyTotal,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.clientSecret) {
        setShowBlikModal(true);
      }
    },
    onError: (error: any) => {
      toast.error('Błąd podczas tworzenia płatności Blik', {
        description: error.message,
      });
    },
  });

  const handlePaymentMethodSelect = (method: 'card' | 'blik') => {
    setSelectedPaymentMethod(method);
    setShowPaymentMethodDialog(false);
    
    if (method === 'card') {
      createCheckoutMutation.mutate();
    } else {
      createBlikPaymentMutation.mutate();
    }
  };

  const toggleBusiness = (businessId: string) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const calculateTotal = (prorated = false) => {
    if (!businesses || !subscriptionTypes) return 0;

    // Group businesses by subscription type for tiered pricing
    const businessGroups = selectedBusinesses.reduce((acc, businessId) => {
      const business = businesses.find(b => b.id === businessId);
      if (!business) return acc;

      const subType = business.entity_type === 'sp_zoo' || business.entity_type === 'sa'
        ? 'spolka'
        : 'jdg';

      if (!acc[subType]) {
        acc[subType] = [];
      }
      acc[subType].push(business);
      return acc;
    }, {} as Record<string, typeof businesses>);

    let total = 0;

    for (const [subType, typeBusinesses] of Object.entries(businessGroups)) {
      const subscriptionType = subscriptionTypes.find(st => st.name === subType);
      if (!subscriptionType) continue;

      const businessCount = typeBusinesses.length;
      const currency = currencySettings?.currency?.toLowerCase() || 'eur';

      // Check if using tiered pricing
      if (subscriptionType.uses_tiered_pricing) {
        // Use tiered pricing (price per business)
        const pricePerBusiness = currency === 'eur' 
          ? subscriptionType.price_per_business_eur 
          : subscriptionType.price_per_business || subscriptionType.price_monthly;
        
        total += pricePerBusiness * businessCount;
      } else {
        // Legacy pricing (individual per business)
        const price = billingCycle === 'annual'
          ? (currency === 'eur' 
              ? subscriptionType.price_annual_eur 
              : subscriptionType.price_annual)
          : (currency === 'eur'
              ? subscriptionType.price_monthly_eur 
              : subscriptionType.price_monthly);
        
        total += price * businessCount;
      }
    }

    // Apply proration for mid-month billing
    if (prorated && billingCycle === 'monthly') {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - today.getDate();
      const prorationRatio = daysRemaining / daysInMonth;
      total = Math.round(total * prorationRatio);
    }

    return total;
  };

  const calculateProratedTotal = () => calculateTotal(true);
  const isMidMonth = new Date().getDate() > 1;

  const formatPrice = (amount: number) => {
    const currency = currencySettings?.currency || 'EUR';
    const locale = currency === 'PLN' ? 'pl-PL' : 'de-DE';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  const getSubscriptionTypeForBusiness = (business: BusinessProfile) => {
    if (!subscriptionTypes) return null;
    
    const subType = business.entity_type === 'sp_zoo' || business.entity_type === 'sa'
      ? 'spolka'
      : 'jdg';

    return subscriptionTypes.find(st => st.name === subType);
  };

  const hasActiveSubscription = (business: BusinessProfile) => {
    return business.subscription_status === 'active' && 
           business.subscription_tier !== 'free';
  };

  if (loadingBusinesses) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!businesses || businesses.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nie masz jeszcze żadnych profili biznesowych. Utwórz profil, aby móc wykupić subskrypcję.
        </AlertDescription>
      </Alert>
    );
  }

  const totalAmount = calculateTotal();
  const annualSavings = selectedBusinesses.reduce((total, businessId) => {
    const business = businesses.find(b => b.id === businessId);
    if (!business) return total;

    const subscriptionType = getSubscriptionTypeForBusiness(business);
    if (!subscriptionType) return total;

    const monthlyYearly = subscriptionType.price_monthly * 12;
    const annualPrice = subscriptionType.price_annual;
    return total + (monthlyYearly - annualPrice);
  }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Wybierz firmy do objęcia planem Premium</CardTitle>
          <CardDescription>
            Zaznacz firmy, dla których chcesz wykupić subskrypcję Premium
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {businesses.map((business) => {
            const subscriptionType = getSubscriptionTypeForBusiness(business);
            const isActive = hasActiveSubscription(business);
            const price = billingCycle === 'annual'
              ? subscriptionType?.price_annual
              : subscriptionType?.price_monthly;

            return (
              <div
                key={business.id}
                className={`flex items-start space-x-3 p-4 border rounded-lg ${
                  isActive ? 'bg-green-50 border-green-200' : 'hover:bg-gray-800'
                }`}
              >
                <Checkbox
                  id={business.id}
                  checked={selectedBusinesses.includes(business.id)}
                  onCheckedChange={() => toggleBusiness(business.id)}
                  disabled={isActive}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={business.id}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <Building2 className="h-4 w-4" />
                      {business.name}
                    </Label>
                    {price && (
                      <span className="text-sm font-semibold">
                        {formatPrice(price)}
                        <span className="text-xs text-gray-500 ml-1">
                          / {billingCycle === 'annual' ? 'rok' : 'miesiąc'}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 space-y-1">
                    <p className="text-sm text-gray-600">
                      {subscriptionType?.display_name}
                    </p>
                    {isActive && (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-3 w-3" />
                        Aktywna subskrypcja
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cykl rozliczeniowy</CardTitle>
          <CardDescription>
            Wybierz, jak często chcesz płacić za subskrypcję
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={billingCycle} onValueChange={(value: any) => setBillingCycle(value)}>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-800">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                <div className="font-medium">Miesięcznie</div>
                <div className="text-sm text-gray-400">
                  Płatność co miesiąc, możliwość anulowania w każdej chwili
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-800">
              <RadioGroupItem value="annual" id="annual" />
              <Label htmlFor="annual" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Rocznie</div>
                  {annualSavings > 0 && (
                    <span className="text-sm text-green-400">
                      Oszczędzasz {formatPrice(annualSavings)}!
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Płatność raz w roku, ~2 miesiące gratis
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Podsumowanie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Wybrane firmy:</span>
            <span className="font-medium">{selectedBusinesses.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Cykl rozliczeniowy:</span>
            <span className="font-medium">
              {billingCycle === 'annual' ? 'Roczny' : 'Miesięczny'}
            </span>
          </div>
          <div className="border-t pt-4">
            {isMidMonth && billingCycle === 'monthly' && selectedBusinesses.length > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-amber-800">
                    📅 Kwota za resztę miesiąca (proporcjonalnie):
                  </span>
                  <span className="font-semibold text-amber-800">
                    {formatPrice(calculateProratedTotal())}
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  Płacisz tylko za {new Date().getDate() === 1 ? 'cały' : `${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} pozostałych`} dni tego miesiąca
                </p>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                {isMidMonth && billingCycle === 'monthly' ? 'Suma teraz:' : 'Suma:'}
              </span>
              <span className="text-2xl font-bold">
                {formatPrice(isMidMonth && billingCycle === 'monthly' ? calculateProratedTotal() : totalAmount)}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-right mt-1">
              {billingCycle === 'annual' 
                ? 'Płatność roczna' 
                : isMidMonth 
                  ? 'Płatność proporcjonalna za ten miesiąc' 
                  : 'Płatność miesięczna'
              }
            </p>
          </div>

          <Button
            onClick={() => setShowPaymentMethodDialog(true)}
            disabled={selectedBusinesses.length === 0}
            className="w-full"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Przejdź do płatności ({formatPrice(isMidMonth && billingCycle === 'monthly' ? calculateProratedTotal() : totalAmount)})
          </Button>

          <p className="text-xs text-center text-gray-500">
            Zostaniesz przekierowany do bezpiecznej strony płatności Stripe
          </p>
        </CardContent>
      </Card>

      {/* Payment Method Selection Dialog */}
      <PaymentMethodDialog
        open={showPaymentMethodDialog}
        onOpenChange={setShowPaymentMethodDialog}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        totalAmount={totalAmount}
        businessCount={selectedBusinesses.length}
        billingCycle={billingCycle}
        blikEnabled={currencySettings?.blik_enabled ?? false}
        currency={currencySettings?.currency ?? 'EUR'}
        currencySymbol={currencySettings?.currency_symbol ?? '€'}
      />

      {/* Blik Payment Modal */}
      <BlikPaymentModal
        isOpen={showBlikModal}
        onClose={() => setShowBlikModal(false)}
        amount={totalAmount}
      />
    </div>
  );
};
