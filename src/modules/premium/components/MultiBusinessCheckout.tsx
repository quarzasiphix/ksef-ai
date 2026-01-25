import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/context/AuthContext';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Label } from '@/shared/ui/label';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Loader2, Building2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
  features: string[];
}

export const MultiBusinessCheckout: React.FC = () => {
  const { user } = useAuth();
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-premium-checkout', {
        body: {
          businessProfileIds: selectedBusinesses,
          billingCycle,
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

  const toggleBusiness = (businessId: string) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    );
  };

  const calculateTotal = () => {
    if (!businesses || !subscriptionTypes) return 0;

    return selectedBusinesses.reduce((total, businessId) => {
      const business = businesses.find(b => b.id === businessId);
      if (!business) return total;

      const subType = business.entity_type === 'sp_zoo' || business.entity_type === 'sa'
        ? 'spolka'
        : 'jdg';

      const subscriptionType = subscriptionTypes.find(st => st.name === subType);
      if (!subscriptionType) return total;

      const price = billingCycle === 'annual'
        ? subscriptionType.price_annual
        : subscriptionType.price_monthly;

      return total + price;
    }, 0);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
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
                  isActive ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'
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
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="monthly" id="monthly" />
              <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                <div className="font-medium">Miesięcznie</div>
                <div className="text-sm text-gray-600">
                  Płatność co miesiąc, możliwość anulowania w każdej chwili
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
              <RadioGroupItem value="annual" id="annual" />
              <Label htmlFor="annual" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Rocznie</div>
                  {annualSavings > 0 && (
                    <span className="text-sm font-semibold text-green-600">
                      Oszczędzasz {formatPrice(annualSavings)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
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
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Suma:</span>
              <span className="text-2xl font-bold">
                {formatPrice(totalAmount)}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-right mt-1">
              {billingCycle === 'annual' ? 'Płatność roczna' : 'Płatność miesięczna'}
            </p>
          </div>

          <Button
            onClick={() => createCheckoutMutation.mutate()}
            disabled={selectedBusinesses.length === 0 || createCheckoutMutation.isPending}
            className="w-full"
            size="lg"
          >
            {createCheckoutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Przekierowywanie do płatności...
              </>
            ) : (
              <>Przejdź do płatności ({formatPrice(totalAmount)})</>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Zostaniesz przekierowany do bezpiecznej strony płatności Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
