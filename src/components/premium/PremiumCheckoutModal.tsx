
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PlanDetails {
  id: string;
  name: string;
  price: string;
  priceId: string;
  productId: string;
  interval: string;
  savings?: string;
  popular?: boolean;
}

const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({ isOpen, onClose }) => {
  const { user, supabase } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const plans: PlanDetails[] = [
    {
      id: 'monthly',
      name: 'Miesięczny',
      price: '19 zł',
      priceId: 'price_1RUC3sQdcZQu3wLBGkQywvga',
      productId: 'prod_SP03iOrYwe0qGH',
      interval: 'miesiąc',
    },
    {
      id: 'annual',
      name: 'Roczny',
      price: '150 zł',
      priceId: 'price_1RWwhWQdcZQu3wLBnCkEmFgg',
      productId: 'prod_SRqOToD9rHiYPJ',
      interval: 'rok',
      savings: 'Oszczędzasz 78 zł',
      popular: true,
    }
  ];

  const handleCheckout = async (plan: PlanDetails) => {
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

    setIsLoading(plan.id);

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        method: 'POST',
        body: {
          priceId: plan.priceId,
          userId: user.id,
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

  const features = [
    "Nieograniczone profile firmowe",
    "Nieograniczone faktury i dokumenty",
    "Zaawansowane raporty i statystyki",
    "Eksport danych (JPK, KSeF)",
    "Priorytetowe wsparcie techniczne",
    "Backup i synchronizacja danych"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <Star className="mr-2 h-6 w-6 text-amber-500" fill="currentColor"/>
            Wybierz Plan Premium
          </DialogTitle>
          <DialogDescription>
            Odblokuj pełne możliwości aplikacji dzięki subskrypcji Premium!
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-6">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.popular ? 'border-amber-500 shadow-lg' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white">
                  Najpopularniejszy
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </div>
                {plan.savings && (
                  <p className="text-sm text-green-600 font-medium">{plan.savings}</p>
                )}
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleCheckout(plan)}
                  disabled={!!isLoading}
                  className={`w-full mb-4 ${plan.popular ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                >
                  {isLoading === plan.id ? "Przekierowanie..." : "Wybierz Plan"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Co otrzymasz z Premium:</h4>
          <div className="grid md:grid-cols-2 gap-2">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center text-sm">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Anuluj</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumCheckoutModal;
