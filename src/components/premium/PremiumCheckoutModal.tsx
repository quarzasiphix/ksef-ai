
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check, CreditCard, Smartphone, Crown, Gift, Sparkles } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BlikPaymentModal } from "./BlikPaymentModal";
import { checkTrialEligibility } from "@/integrations/supabase/repositories/PremiumRepository";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  cardPriceId: string;
  blikPriceId: string;
  productId: string;
  interval: string;
  savings?: string;
  popular?: boolean;
}

const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({ isOpen, onClose }) => {
  const { user, supabase, isPremium, setIsPremium } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'blik'>('card');
  const [step, setStep] = useState<'plan' | 'payment'>('plan');
  const [showBlikModal, setShowBlikModal] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<'monthly' | 'annual' | null>(null);
  const [isTrialEligible, setIsTrialEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const plans: PlanDetails[] = [
    {
      id: 'monthly',
      name: 'Miesięczny',
      price: '19 zł',
      cardPriceId: 'price_1RWw1eHFbUxWftPsIEZ4PhhH',
      blikPriceId: 'price_1RXInCHFbUxWftPsZfJCiZKM',
      productId: 'prod_SRphekdFtboZQs',
      interval: 'miesiąc',
    },
    {
      id: 'annual',
      name: 'Roczny',
      price: '150 zł',
      cardPriceId: 'price_1RX4m0HFbUxWftPsK1uBmUM6',
      blikPriceId: 'price_1RXInbHFbUxWftPsP3u34dst',
      productId: 'prod_SRphekdFtboZQs',
      interval: 'rok',
      savings: 'Oszczędzasz 78 zł',
      popular: true,
    }
  ];

  // Check current subscription and trial eligibility when modal opens
  useEffect(() => {
    const checkStatus = async () => {
        if (isOpen && user) {
            setCheckingEligibility(true);
            if (isPremium) {
                // If user is already premium, they can't have a trial.
                // We can still check their current plan for management purposes.
                await checkCurrentSubscription();
                setIsTrialEligible(false);
            } else {
                // If not premium, check if they are eligible for a trial.
                const eligible = await checkTrialEligibility(user.id);
                setIsTrialEligible(eligible);
            }
            setCheckingEligibility(false);
        }
    };
    checkStatus();
  }, [isOpen, isPremium, user]);

  const checkCurrentSubscription = async () => {
    if (!user || !supabase) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      // Determine subscription type based on price - this is a simplified check
      // In a real scenario, you'd want to store more detailed subscription info
      if (data?.subscription_tier) {
        // Assuming monthly subscriptions are typically lower priced
        // This would need to be adjusted based on your actual pricing logic
        setCurrentSubscription('monthly'); // Default assumption
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleStartTrial = async () => {
    if (!user || !supabase) return;

    setIsLoading('trial');
    try {
      const { error } = await supabase.functions.invoke('start-free-trial');

      if (error) {
        throw new Error(error.message || "Nie udało się rozpocząć okresu próbnego.");
      }
      
      toast.success("7-dniowy darmowy okres próbny został aktywowany!");
      setIsPremium(true); // Update context state to reflect premium status
      onClose();
    } catch (error: any) {
        toast.error(error.message);
        if (error.message.includes('eligible')) {
            setIsTrialEligible(false);
        }
    } finally {
        setIsLoading(null);
    }
  };

  const handlePlanSelect = (plan: PlanDetails) => {
    // Don't allow selection of current plan
    if (isPremium && currentSubscription === plan.id) {
      return;
    }
    
    setSelectedPlan(plan);
    setStep('payment');
  };

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    if (paymentMethod === 'blik') {
      setShowBlikModal(true);
      return;
    }

    if (!user?.id) {
      console.error("User not logged in.");
      toast.error("Musisz być zalogowany, aby kupić subskrypcję.");
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available.");
      toast.error("Wystąpił problem z połączeniem. Spróbuj ponownie później.");
      return;
    }

    setIsLoading(selectedPlan.id);

    try {
      const priceId = selectedPlan.cardPriceId;
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        method: 'POST',
        body: {
          priceId: priceId,
          userId: user.id,
          paymentMethod: 'card',
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Nie udało się utworzyć sesji płatności. Spróbuj ponownie.");
        return;
      }

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL received.");
        toast.error("Nie otrzymano adresu przekierowania płatności.");
      }
    } catch (error) {
      console.error("Error during checkout process:", error);
      toast.error("Wystąpił nieoczekiwany błąd podczas płatności.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleBack = () => {
    setStep('plan');
    setSelectedPlan(null);
  };

  const handleClose = () => {
    setStep('plan');
    setSelectedPlan(null);
    setPaymentMethod('card');
    onClose();
  };

  const isPlanCurrent = (planId: string) => {
    return isPremium && currentSubscription === planId;
  };

  const getPlanStatusMessage = (planId: string) => {
    if (isPlanCurrent(planId)) {
      return "Masz ten plan";
    }
    return null;
  };

  const getModalTitle = () => {
    if (isPremium) {
      if (currentSubscription === 'annual') {
        return 'Zarządzaj Premium';
      }
      return 'Ulepsz Plan Premium';
    }
    return 'Wybierz Plan Premium';
  };

  const getModalDescription = () => {
    if (isPremium) {
      if (currentSubscription === 'annual') {
        return 'Masz już najlepszy plan Premium! Możesz zarządzać subskrypcją w ustawieniach.';
      }
      return 'Przejdź na plan roczny i zaoszczędź więcej!';
    }
    return 'Odblokuj pełne możliwości aplikacji dzięki subskrypcji Premium!';
  };

  const features = [
    "Nieograniczone profile firmowe",
    "Nieograniczone faktury i dokumenty",
    "Zaawansowane raporty i statystyki",
    "Eksport danych (JPK, KSeF)",
    "Priorytetowe wsparcie techniczne",
    "Backup i synchronizacja danych",
    "Automiczne wysyłanie faktur na e-mail"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[600px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center text-lg sm:text-xl">
            {isPremium ? (
              <Crown className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-amber-500" fill="currentColor"/>
            ) : (
              <Star className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-amber-500" fill="currentColor"/>
            )}
            {step === 'plan' ? getModalTitle() : 'Wybierz metodę płatności'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'plan' 
              ? getModalDescription()
              : `Wybrany plan: ${selectedPlan?.name} (${selectedPlan?.price}/${selectedPlan?.interval})`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <>
            {checkingEligibility ? (
                <div className="py-10 flex justify-center items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sprawdzanie uprawnień...</span>
                </div>
            ) : isTrialEligible && !isPremium ? (
                <div className="mb-6">
                    <div className="relative overflow-hidden p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl border-2 border-emerald-200 shadow-lg">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-full -translate-y-10 translate-x-10 opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-teal-100 rounded-full translate-y-8 -translate-x-8 opacity-30"></div>
                        
                        {/* Content */}
                        <div className="relative text-center space-y-4">
                            <div className="flex justify-center items-center space-x-2">
                                <div className="relative">
                                    <Crown className="h-12 w-12 text-emerald-600 animate-pulse" fill="currentColor" />
                                    <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500 animate-bounce" fill="currentColor" />
                                </div>
                                <Gift className="h-8 w-8 text-emerald-500 animate-bounce" style={{ animationDelay: '0.5s' }} />
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-emerald-800">
                                    Wypróbuj Premium za Darmo!
                                </h3>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 px-3 py-1 text-sm font-semibold">
                                    🎉 Oferta specjalna
                                </Badge>
                            </div>
                            
                            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-emerald-200">
                                <p className="text-emerald-700 text-sm leading-relaxed">
                                    Jesteś uprawniony do <span className="font-bold text-emerald-800">7-dniowego darmowego okresu próbnego</span>. 
                                    Aktywuj go teraz i odblokuj wszystkie funkcje Premium bez żadnych zobowiązań!
                                </p>
                                
                                <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs">
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                        ✓ Bez karty
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                        ✓ Bez zobowiązań
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-200">
                                        ✓ Anuluj w każdej chwili
                                    </span>
                                </div>
                            </div>
                            
                            <Button
                                onClick={handleStartTrial}
                                disabled={!!isLoading}
                                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                                size="lg"
                            >
                                {isLoading === 'trial' ? (
                                    <div className="flex items-center space-x-2">
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Aktywowanie...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <Crown className="h-5 w-5" fill="currentColor" />
                                        <span>Aktywuj 7-dniowy okres próbny</span>
                                        <Sparkles className="h-4 w-4" fill="currentColor" />
                                    </div>
                                )}
                            </Button>
                        </div>
                    </div>
                    
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-4 text-gray-500 font-medium">
                                LUB WYBIERZ PLAN PŁATNY
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}

            {isPremium && currentSubscription === 'annual' ? (
              <div className="py-6">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mb-4">
                    <Crown className="h-8 w-8 text-white" fill="currentColor" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Masz już najlepszy plan!</h3>
                  <p className="text-muted-foreground mb-6">
                    Korzystasz z rocznej subskrypcji Premium z wszystkimi dostępnymi funkcjami.
                  </p>
                  <Button variant="outline" onClick={handleClose}>
                    Wróć do ustawień
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-3 py-3">
                  {plans.map((plan) => {
                    const isCurrent = isPlanCurrent(plan.id);
                    const statusMessage = getPlanStatusMessage(plan.id);
                    
                    return (
                      <Card key={plan.id} className={`relative ${
                        plan.popular && !isCurrent ? 'border-amber-500 shadow-lg' : 
                        isCurrent ? 'border-green-500 bg-green-50' : ''
                      }`}>
                        {plan.popular && !isCurrent && (
                          <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs">
                            Najpopularniejszy
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs">
                            Aktualny plan
                          </Badge>
                        )}
                        <CardHeader className="text-center p-3">
                          <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                          <div className="mt-1">
                            <span className="text-xl sm:text-2xl font-bold">{plan.price}</span>
                            <span className="text-muted-foreground text-xs">/{plan.interval}</span>
                          </div>
                          {plan.savings && !isCurrent && (
                            <p className="text-xs text-green-600 font-medium">{plan.savings}</p>
                          )}
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <Button
                            onClick={() => handlePlanSelect(plan)}
                            disabled={!!isLoading || isCurrent}
                            className={`w-full text-sm ${
                              plan.popular && !isCurrent ? 'bg-amber-500 hover:bg-amber-600' : ''
                            } ${isCurrent ? 'bg-green-100 text-green-700 cursor-not-allowed' : ''}`}
                            variant={isCurrent ? 'outline' : 'default'}
                          >
                            {statusMessage || 'Wybierz Plan'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="bg-muted p-2 rounded-lg">
                  <h4 className="font-semibold mb-1.5 text-xs sm:text-sm">Co otrzymasz z Premium:</h4>
                  <div className="grid md:grid-cols-2 gap-1">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-center text-xs">
                        <Check className="h-3 w-3 text-green-500 mr-1.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {step === 'payment' && selectedPlan && (
          <div className="py-2 space-y-3">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm sm:text-base">Wybierz metodę płatności</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'blik') => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                      <div>
                        <div className="font-medium text-xs sm:text-sm">Karta płatnicza</div>
                        <div className="text-xs text-muted-foreground">Subskrypcja automatyczna</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="blik" id="blik" />
                    <Label htmlFor="blik" className="flex items-center cursor-pointer flex-1">
                      <Smartphone className="h-4 w-4 mr-2 text-pink-600" />
                      <div>
                        <div className="font-medium text-xs sm:text-sm">BLIK</div>
                        <div className="text-xs text-muted-foreground">Jednorazowa płatność</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="bg-muted p-2 rounded-lg">
              <h4 className="font-semibold mb-1.5 text-xs sm:text-sm">Szczegóły płatności:</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span>{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cena:</span>
                  <span>{selectedPlan.price}</span>
                </div>
                <div className="flex justify-between">
                  <span>Metoda:</span>
                  <span>{paymentMethod === 'card' ? 'Karta' : 'BLIK'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Typ:</span>
                  <span>{paymentMethod === 'card' ? 'Subskrypcja' : 'Jednorazowa'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1 text-xs sm:text-sm">
                Wróć
              </Button>
              <Button 
                onClick={handleCheckout} 
                disabled={!!isLoading}
                className="flex-1 text-xs sm:text-sm"
              >
                {isLoading ? "Przekierowanie..." : "Przejdź do płatności"}
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && selectedPlan && (
          <BlikPaymentModal
            isOpen={showBlikModal}
            onClose={() => setShowBlikModal(false)}
            amount={selectedPlan ? parseInt(selectedPlan.price) * 100 : 0}
          />
        )}

        <DialogFooter className="mt-1">
          <DialogClose asChild>
            <Button variant="outline" onClick={handleClose} className="text-xs sm:text-sm">Anuluj</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumCheckoutModal;
