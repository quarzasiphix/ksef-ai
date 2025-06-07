import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check, CreditCard, Smartphone } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BlikPaymentModal } from "./BlikPaymentModal";

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
  const { user, supabase } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetails | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'blik'>('card');
  const [step, setStep] = useState<'plan' | 'payment'>('plan');
  const [showBlikModal, setShowBlikModal] = useState(false);

  const plans: PlanDetails[] = [
    {
      id: 'monthly',
      name: 'Miesięczny',
      price: '19 zł',
      // Card payments (recurring subscription)
      cardPriceId: 'price_1RWw1eHFbUxWftPsIEZ4PhhH',
      // BLIK payments (one-off)
      blikPriceId: 'price_1RXInCHFbUxWftPsZfJCiZKM',
      productId: 'prod_SRphekdFtboZQs',
      interval: 'miesiąc',
    },
    {
      id: 'annual',
      name: 'Roczny',
      price: '150 zł',
      // Card payments (recurring subscription)
      cardPriceId: 'price_1RX4m0HFbUxWftPsK1uBmUM6',
      // BLIK payments (one-off)
      blikPriceId: 'price_1RXInbHFbUxWftPsP3u34dst',
      productId: 'prod_SRphekdFtboZQs',
      interval: 'rok',
      savings: 'Oszczędzasz 78 zł',
      popular: true,
    }
  ];

  const handlePlanSelect = (plan: PlanDetails) => {
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
      // Only card payments go through Stripe Checkout
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

  const features = [
    "Nieograniczone profile firmowe",
    "Nieograniczone faktury i dokumenty",
    "Zaawansowane raporty i statystyki",
    "Eksport danych (JPK, KSeF)",
    "Priorytetowe wsparcie techniczne",
    "Backup i synchronizacja danych"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-[90vw] md:w-[80vw] lg:w-[600px]">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center text-lg sm:text-xl">
            <Star className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-amber-500" fill="currentColor"/>
            {step === 'plan' ? 'Wybierz Plan Premium' : 'Wybierz metodę płatności'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'plan' 
              ? 'Odblokuj pełne możliwości aplikacji dzięki subskrypcji Premium!'
              : `Wybrany plan: ${selectedPlan?.name} (${selectedPlan?.price}/${selectedPlan?.interval})`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'plan' && (
          <>
            <div className="grid md:grid-cols-2 gap-3 py-3">
              {plans.map((plan) => (
                <Card key={plan.id} className={`relative ${plan.popular ? 'border-amber-500 shadow-lg' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white text-xs">
                      Najpopularniejszy
                    </Badge>
                  )}
                  <CardHeader className="text-center p-3">
                    <CardTitle className="text-base sm:text-lg">{plan.name}</CardTitle>
                    <div className="mt-1">
                      <span className="text-xl sm:text-2xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-xs">/{plan.interval}</span>
                    </div>
                    {plan.savings && (
                      <p className="text-xs text-green-600 font-medium">{plan.savings}</p>
                    )}
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      disabled={!!isLoading}
                      className={`w-full text-sm ${plan.popular ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                    >
                      Wybierz Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
