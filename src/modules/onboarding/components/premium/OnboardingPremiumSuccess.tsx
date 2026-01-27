import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { 
  CheckCircle2, 
  Crown, 
  Star, 
  Zap, 
  Shield, 
  TrendingUp,
  ArrowRight,
  Sparkles,
  Gift,
  Rocket,
  Target
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface OnboardingPremiumSuccessProps {
  onSkip?: () => void;
  onComplete?: () => void;
}

export const OnboardingPremiumSuccess: React.FC<OnboardingPremiumSuccessProps> = ({
  onSkip,
  onComplete
}) => {
  const navigate = useNavigate();
  const { openPremiumDialog } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  
  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const handleUpgradeClick = () => {
    openPremiumDialog();
    onComplete?.();
  };

  const handleSkipClick = () => {
    toast.success('Możesz zawsze przejść na Premium w ustawieniach!');
    onSkip?.();
  };

  const premiumFeatures = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Integracja z KSeF",
      description: "Automatyczna wysyłka i pobieranie faktur z systemu KSeF",
      popular: true
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Automatyczne księgowanie",
      description: "Inteligentne księgowanie faktur z podziałem na VAT i koszty"
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Zaawansowane raporty",
      description: "Analiza finansowa, prognozy i wskaźniki biznesowe"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Wsparcie priorytetowe",
      description: "Szybka pomoc ekspertów i dedykowany opiekun klienta"
    }
  ];

  const pricingPlans = [
    {
      name: "JDG",
      price: "19 zł",
      period: "miesięcznie",
      annualPrice: "190 zł",
      features: ["Wszystkie funkcje Premium", "Dla działalności gospodarczej"],
      popular: false,
      color: "blue"
    },
    {
      name: "Spółka",
      price: "89 zł", 
      period: "miesięcznie",
      annualPrice: "890 zł",
      features: ["Wszystkie funkcje Premium", "Dla Sp. z o.o. i S.A.", "Zaawansowane raporty"],
      popular: true,
      color: "purple"
    }
  ];

  return (
    <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div className="absolute -top-1 -right-1">
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Świetnie! Twoja firma jest gotowa
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-2">
          {selectedProfile?.name} została pomyślnie dodana do systemu
        </p>
        
        <Badge variant="secondary" className="mb-8 text-sm">
          {selectedProfile?.entityType === 'dzialalnosc' ? 'Działalność gospodarcza' : 
           selectedProfile?.entityType === 'sp_zoo' ? 'Sp. z o.o.' : 
           selectedProfile?.entityType === 'sa' ? 'S.A.' : 'Firma'}
        </Badge>
      </motion.div>

      {/* Premium Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full mb-8"
      >
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-amber-800 dark:text-amber-200">
              Odblokuj pełnię możliwości KsięgaI
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300 text-lg">
              Przyspiesz pracę o 80% i zautomatyzuj księgowanie
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Premium Features Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {premiumFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/20"
                >
                  <div className="flex-shrink-0 text-amber-600 dark:text-amber-400">
                    {feature.icon}
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">
                      {feature.title}
                      {feature.popular && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Popularne
                        </Badge>
                      )}
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                >
                  <Card className={`relative ${plan.popular ? 'border-amber-400 shadow-lg' : 'border-border'}`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-amber-400 text-amber-900">
                          <Star className="h-3 w-3 mr-1" />
                          Najlepszy wybór
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pt-6">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <div className="space-y-1">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-bold">{plan.price}</span>
                          <span className="text-muted-foreground">/{plan.period}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {plan.annualPrice} rocznie (oszczędzasz 2 miesiące)
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <ul className="text-sm space-y-2">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleUpgradeClick}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                <Crown className="h-5 w-5 mr-2" />
                Przejdź na Premium
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => setShowPricingDialog(true)}
              >
                <Gift className="h-5 w-5 mr-2" />
                Zobacz szczegóły
              </Button>
            </div>

            {/* Skip Option */}
            <div className="text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkipClick}
                className="text-muted-foreground hover:text-foreground"
              >
                Pomiń na razie - przejdź do pulpitu
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alternative: Quick Start */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="text-center"
      >
        <p className="text-sm text-muted-foreground mb-4">
          Lub zacznij od razu z darmową wersją
        </p>
        <Button 
          size="lg" 
          variant="ghost" 
          onClick={() => navigate('/income/new')}
          className="text-blue-600 hover:text-blue-700"
        >
          <Rocket className="h-5 w-5 mr-2" />
          Wystaw pierwszą fakturę — 30 sekund
        </Button>
      </motion.div>

      {/* Pricing Detail Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Crown className="h-6 w-6 text-amber-500" />
              Wybierz plan Premium
            </DialogTitle>
            <DialogDescription>
              Odblokuj wszystkie funkcje i przyspiesz pracę swojej firmy
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Feature Comparison */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <h4 className="font-medium">Darmowy</h4>
                <p className="text-sm text-muted-foreground">Podstawowe funkcje</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-amber-600">JDG Premium</h4>
                <p className="text-sm text-muted-foreground">19 zł/miesiąc</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-amber-600">Spółka Premium</h4>
                <p className="text-sm text-muted-foreground">89 zł/miesiąc</p>
              </div>
            </div>
            
            {/* Detailed Features */}
            <div className="space-y-3">
              {[
                "Wystawianie faktur",
                "Podstawowe raporty",
                "Księgowanie VAT",
                "Integracja KSeF",
                "Automatyczne księgowanie",
                "Zaawansowane analizy",
                "API dostępowe",
                "Wsparcie priorytetowe"
              ].map((feature, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">{feature}</span>
                  <div className="flex gap-4">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center">
              <Button onClick={handleUpgradeClick} className="bg-amber-500 hover:bg-amber-600">
                <Crown className="h-5 w-5 mr-2" />
                Przejdź na Premium
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
