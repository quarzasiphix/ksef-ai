import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Check, CreditCard, Smartphone, Crown, Gift, Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Label } from "@/shared/ui/label";
import { BlikPaymentModal } from "./BlikPaymentModal";
import { checkTrialEligibility } from "@/modules/premium/data/PremiumRepository";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: string;
}

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  cardPriceId: string;
  blikPriceId: string;
  interval: string;
}

const plans: PlanDetails[] = [
  {
    id: 'monthly',
    name: 'Miesięczny',
    price: '19 zł',
    cardPriceId: 'price_1RWw1eHFbUxWftPsIEZ4PhhH',
    blikPriceId: 'price_1RXInCHFbUxWftPsZfJCiZKM',
    interval: 'miesiąc',
  },
  {
    id: 'annual',
    name: 'Roczny',
    price: '150 zł',
    cardPriceId: 'price_1RX4m0HFbUxWftPsK1uBmUM6',
    blikPriceId: 'price_1RXInbHFbUxWftPsP3u34dst',
    interval: 'rok',
  },
  {
    id: 'lifetime',
    name: 'Dożywotni',
    price: '999 zł',
    cardPriceId: 'price_1Ree8yHFbUxWftPsTXELigg7',
    blikPriceId: 'price_1Ree8yHFbUxWftPsTXELigg7',
    interval: 'jednorazowo',
  }
];

const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({ isOpen, onClose, initialPlanId }) => {
  const navigate = useNavigate();
  const { user, supabase, isPremium, setIsPremium } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'blik'>('card');
  const [showBlikModal, setShowBlikModal] = useState(false);
  const [isTrialEligible, setIsTrialEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // Check trial eligibility when modal opens
  useEffect(() => {
    const checkStatus = async () => {
      if (isOpen && user) {
        setCheckingEligibility(true);
        if (isPremium) {
          setIsTrialEligible(false);
        } else {
          const eligible = await checkTrialEligibility(user.id);
          setIsTrialEligible(eligible);
        }
        setCheckingEligibility(false);
      }
    };
    checkStatus();
  }, [isOpen, isPremium, user]);

  // Preselect plan when modal is opened with initialPlanId
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setPaymentMethod('card');
      return;
    }
    
    if (initialPlanId) {
      const plan = plans.find((p) => p.id === initialPlanId);
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [isOpen, initialPlanId]);

  const handleStartTrial = async () => {
    if (!user || !supabase) return;

    setIsLoading('trial');
    try {
      const { error } = await supabase.functions.invoke('start-free-trial');

      if (error) {
        throw new Error(error.message || "Nie udało się rozpocząć okresu próbnego.");
      }
      
      toast.success("7-dniowy darmowy okres próbny został aktywowany!");
      setIsPremium(true);
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

  const handleCheckout = async () => {
    if (!selectedPlan) return;

    if (paymentMethod === 'blik') {
      setShowBlikModal(true);
      return;
    }

    if (!user?.id) {
      toast.error("Musisz być zalogowany, aby kupić subskrypcję.");
      return;
    }

    if (!supabase) {
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
        toast.error("Nie udało się utworzyć sesji płatności. Spróbuj ponownie.");
        return;
      }

      if (data && data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Nie otrzymano adresu przekierowania płatności.");
      }
    } catch (error) {
      toast.error("Wystąpił nieoczekiwany błąd podczas płatności.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleClose = () => {
    setSelectedPlan(null);
    setPaymentMethod('card');
    onClose();
  };

  const handleViewPlans = () => {
    onClose();
    navigate('/premium');
  };

  // If no plan selected, show "choose plan" view that redirects to /premium
  const showPlanSelection = !selectedPlan && !initialPlanId;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            {showPlanSelection ? 'Premium' : `Plan ${selectedPlan?.name}`}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {showPlanSelection 
              ? 'Odblokuj pełne możliwości aplikacji'
              : `${selectedPlan?.price}/${selectedPlan?.interval}`
            }
          </DialogDescription>
        </DialogHeader>

        {checkingEligibility ? (
          <div className="py-8 flex justify-center items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Sprawdzanie...</span>
          </div>
        ) : showPlanSelection ? (
          // No plan selected - show trial + redirect to plans page
          <div className="space-y-4">
            {/* Trial offer */}
            {isTrialEligible && !isPremium && (
              <div className="relative overflow-hidden p-5 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-cyan-950/50 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full -translate-y-10 translate-x-10 opacity-50"></div>
                
                <div className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Crown className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="currentColor" />
                      <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-800 dark:text-blue-200">7 dni za darmo</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Bez karty, bez zobowiązań</p>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleStartTrial}
                    disabled={!!isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    {isLoading === 'trial' ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Aktywowanie...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Gift className="h-4 w-4" />
                        Aktywuj darmowy okres próbny
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Divider */}
            {isTrialEligible && !isPremium && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">lub</span>
                </div>
              </div>
            )}

            {/* Go to plans page */}
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Wybierz plan dopasowany do Twoich potrzeb
              </p>
              <Button 
                onClick={handleViewPlans}
                variant="outline"
                className="w-full"
              >
                Zobacz wszystkie plany
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : selectedPlan ? (
          // Plan selected - show payment method selection
          <div className="space-y-4">
            {/* Plan summary */}
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selectedPlan.name}</p>
                    <p className="text-sm text-muted-foreground">Plan Premium</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{selectedPlan.price}</p>
                    <p className="text-xs text-muted-foreground">/{selectedPlan.interval}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment method */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Metoda płatności</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup value={paymentMethod} onValueChange={(value: 'card' | 'blik') => setPaymentMethod(value)} className="space-y-2">
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
                      <div>
                        <div className="font-medium text-sm">Karta płatnicza</div>
                        <div className="text-xs text-muted-foreground">Automatyczne odnowienie</div>
                      </div>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'blik' ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}>
                    <RadioGroupItem value="blik" id="blik" />
                    <Label htmlFor="blik" className="flex items-center cursor-pointer flex-1">
                      <Smartphone className="h-5 w-5 mr-3 text-pink-600" />
                      <div>
                        <div className="font-medium text-sm">BLIK</div>
                        <div className="text-xs text-muted-foreground">Jednorazowa płatność</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Checkout button */}
            <Button 
              onClick={handleCheckout} 
              disabled={!!isLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-semibold"
              size="lg"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Przekierowanie...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Przejdź do płatności
                </span>
              )}
            </Button>

            {/* Change plan link */}
            <div className="text-center">
              <Button variant="link" onClick={handleViewPlans} className="text-xs text-muted-foreground">
                Zmień plan
              </Button>
            </div>
          </div>
        ) : null}

        {showBlikModal && selectedPlan && (
          <BlikPaymentModal
            isOpen={showBlikModal}
            onClose={() => setShowBlikModal(false)}
            amount={parseInt(selectedPlan.price) * 100}
          />
        )}

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={handleClose} size="sm">
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumCheckoutModal;
