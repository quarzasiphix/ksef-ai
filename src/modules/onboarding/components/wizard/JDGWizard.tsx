import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Badge } from '@/shared/ui/badge';
import { 
  Building2, Users, Briefcase, FolderOpen, CheckCircle2, 
  ArrowRight, ArrowLeft, FileText, Shield, DollarSign, Plus, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { saveBusinessProfile, getBusinessProfiles, checkTaxIdExists } from '@/modules/settings/data/businessProfileRepository';
import { initializeDefaultFolders } from '@/modules/contracts/data/documentsRepository';
import type { BusinessProfile } from '@/shared/types';
import { useAuth } from '@/shared/hooks/useAuth';
import { sendOnboardingWelcomeEmail } from '@/shared/utils/emailService';
import { OnboardingLayout } from '../OnboardingLayout';
import PkdSelector from '@/components/inputs/PkdSelector';

interface JDGWizardProps {
  onComplete?: (profileId: string) => void;
  onCancel?: () => void;
}

interface WizardData {
  // Step 1: Basic Information
  name: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  regon: string;
  email: string;
  phone: string;
  isDefault: boolean;
  
  // Step 2: Tax Information
  taxType: 'skala' | 'liniowy' | 'ryczalt' | 'karta';
  defaultRyczaltRate: number;
  is_vat_exempt: boolean;
  vat_exemption_reason: string;
  vat_threshold_pln: number;
  vat_threshold_year: number;
  
  // Step 3: Business Activities
  pkdCodes: string[];
  businessStartDate: string;
  accountingStartDate: string;
  
  // Step 4: Bank Account
  bankAccount: string;
  bankName: string;
};

const STEPS = [
  { id: 1, title: 'Dane podstawowe', icon: Building2 },
  { id: 2, title: 'Informacje podatkowe', icon: FileText },
  { id: 3, title: 'Działalność', icon: Briefcase },
  { id: 4, title: 'Konto bankowe', icon: Shield },
];

export const JDGWizard: React.FC<JDGWizardProps> = ({ onComplete, onCancel }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    // Step 1
    name: '',
    taxId: '',
    address: '',
    postalCode: '',
    city: '',
    regon: '',
    email: '',
    phone: '',
    isDefault: true,
    
    // Step 2
    taxType: 'skala',
    defaultRyczaltRate: 0,
    is_vat_exempt: false,
    vat_exemption_reason: '',
    vat_threshold_pln: 200000,
    vat_threshold_year: new Date().getFullYear(),
    
    // Step 3
    pkdCodes: [],
    businessStartDate: '',
    accountingStartDate: '',
    
    // Step 4
    bankAccount: '',
    bankName: '',
  });

  const draftKey = user?.id ? `onboarding:jdg:${user.id}` : null;

  // Load draft data on mount
  useEffect(() => {
    if (draftKey && typeof window !== 'undefined') {
      try {
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          const parsed = JSON.parse(draft);
          setWizardData(parsed);
          
          // Find the last incomplete step
          const lastCompletedStep = Math.max(...Object.keys(parsed).filter(key => 
            parsed[key] && parsed[key] !== ''
          ).map(key => {
            if (['name', 'taxId', 'address', 'postalCode', 'city'].includes(key)) return 1;
            if (['taxType', 'is_vat_exempt'].includes(key)) return 2;
            if (['pkdCodes', 'businessStartDate'].includes(key)) return 3;
            if (['bankAccount'].includes(key)) return 4;
            return 1;
          }));
          
          setCurrentStep(Math.min(lastCompletedStep + 1, 4));
        }
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [draftKey]);

  // Save draft data
  useEffect(() => {
    if (draftKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(draftKey, JSON.stringify(wizardData));
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }
  }, [wizardData, draftKey]);

  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.name.trim() && 
               wizardData.taxId.trim().length === 10 && 
               wizardData.address.trim() && 
               wizardData.postalCode.trim() && 
               wizardData.city.trim();
      case 2:
        return wizardData.taxType && 
               (!wizardData.is_vat_exempt || wizardData.vat_exemption_reason.trim());
      case 3:
        return wizardData.pkdCodes.length > 0;
      case 4:
        return wizardData.bankAccount.trim().length >= 26; // Basic Polish IBAN validation
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      
      if (currentStep < 4) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (completedSteps.includes(stepId) || stepId <= currentStep) {
      setCurrentStep(stepId);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        toast.error("Brak informacji o użytkowniku. Zaloguj się ponownie.");
        setLoading(false);
        return;
      }

      const profile: Partial<BusinessProfile> = {
        name: wizardData.name,
        taxId: wizardData.taxId,
        address: wizardData.address,
        postalCode: wizardData.postalCode,
        city: wizardData.city,
        regon: wizardData.regon || undefined,
        email: wizardData.email || undefined,
        phone: wizardData.phone || undefined,
        isDefault: wizardData.isDefault,
        entityType: 'dzialalnosc',
        taxType: wizardData.taxType,
        defaultRyczaltRate: wizardData.defaultRyczaltRate || undefined,
        user_id: user.id,
        is_vat_exempt: wizardData.is_vat_exempt,
        vat_exemption_reason: wizardData.vat_exemption_reason || undefined,
        vat_threshold_pln: wizardData.vat_threshold_pln,
        vat_threshold_year: wizardData.vat_threshold_year,
        business_start_date: wizardData.businessStartDate || undefined,
        accounting_start_date: wizardData.accountingStartDate || undefined,
        pkd_main: wizardData.pkdCodes[0] || undefined,
        bankAccount: wizardData.bankAccount || undefined,
      };

      const savedProfile = await saveBusinessProfile(profile as BusinessProfile);
      
      // Initialize default folders
      if (savedProfile.id) {
        await initializeDefaultFolders(savedProfile.id);
      }

      // Send welcome email
      try {
        await sendOnboardingWelcomeEmail({
          user_name: user.email?.split('@')[0] || 'Użytkowniku',
          business_name: wizardData.name,
        });
        console.log('Welcome email sent successfully');
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }

      // Clean up draft
      if (draftKey && typeof window !== 'undefined') {
        localStorage.removeItem(draftKey);
      }
      
      if (onComplete) {
        onComplete(savedProfile.id);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error creating JDG profile:', error);
      toast.error('Błąd tworzenia profilu JDG');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Dane podstawowe firmy</CardTitle>
              <CardDescription>
                Podstawowe informacje o Twojej działalności gospodarczej
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nazwa firmy *</Label>
                  <Input
                    id="name"
                    value={wizardData.name}
                    onChange={(e) => updateWizardData({ name: e.target.value })}
                    placeholder="Wprowadź nazwę firmy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxId">NIP *</Label>
                  <Input
                    id="taxId"
                    value={wizardData.taxId}
                    onChange={(e) => updateWizardData({ taxId: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="1234567890"
                    maxLength={10}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regon">REGON</Label>
                  <Input
                    id="regon"
                    value={wizardData.regon}
                    onChange={(e) => updateWizardData({ regon: e.target.value })}
                    placeholder="Opcjonalnie"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email firmowy</Label>
                  <Input
                    id="email"
                    type="email"
                    value={wizardData.email}
                    onChange={(e) => updateWizardData({ email: e.target.value })}
                    placeholder="firma@przykład.pl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={wizardData.phone}
                    onChange={(e) => updateWizardData({ phone: e.target.value })}
                    placeholder="+48 123 456 789"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Kod pocztowy *</Label>
                  <Input
                    id="postalCode"
                    value={wizardData.postalCode}
                    onChange={(e) => updateWizardData({ postalCode: e.target.value })}
                    placeholder="00-000"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Adres *</Label>
                  <Input
                    id="address"
                    value={wizardData.address}
                    onChange={(e) => updateWizardData({ address: e.target.value })}
                    placeholder="Ulica 1/2"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city">Miasto *</Label>
                  <Input
                    id="city"
                    value={wizardData.city}
                    onChange={(e) => updateWizardData({ city: e.target.value })}
                    placeholder="Warszawa"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isDefault"
                  checked={wizardData.isDefault}
                  onCheckedChange={(checked) => updateWizardData({ isDefault: checked as boolean })}
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Ustaw jako domyślny profil biznesowy
                </Label>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Informacje podatkowe</CardTitle>
              <CardDescription>
                Ustawienia związane z opodatkowaniem Twojej działalności
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxType">Forma opodatkowania *</Label>
                  <Select
                    value={wizardData.taxType}
                    onValueChange={(value: any) => updateWizardData({ taxType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz formę opodatkowania" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skala">Skala podatkowa</SelectItem>
                      <SelectItem value="liniowy">Podatek liniowy</SelectItem>
                      <SelectItem value="ryczalt">Ryczałt od przychodów ewidencjonowanych</SelectItem>
                      <SelectItem value="karta">Karta podatkowa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {wizardData.taxType === 'ryczalt' && (
                  <div className="space-y-2">
                    <Label htmlFor="defaultRyczaltRate">Stawka ryczałtu (%)</Label>
                    <Select
                      value={wizardData.defaultRyczaltRate.toString()}
                      onValueChange={(value) => updateWizardData({ defaultRyczaltRate: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz stawkę" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2%</SelectItem>
                        <SelectItem value="3">3%</SelectItem>
                        <SelectItem value="5.5">5.5%</SelectItem>
                        <SelectItem value="8.5">8.5%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="12.5">12.5%</SelectItem>
                        <SelectItem value="14">14%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                        <SelectItem value="17">17%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="vat_threshold_pln">Próg zwolnienia VAT (PLN)</Label>
                  <Input
                    id="vat_threshold_pln"
                    type="number"
                    value={wizardData.vat_threshold_pln}
                    onChange={(e) => updateWizardData({ vat_threshold_pln: parseInt(e.target.value) || 200000 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vat_threshold_year">Rok progu VAT</Label>
                  <Input
                    id="vat_threshold_year"
                    type="number"
                    value={wizardData.vat_threshold_year}
                    onChange={(e) => updateWizardData({ vat_threshold_year: parseInt(e.target.value) || new Date().getFullYear() })}
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_vat_exempt"
                    checked={wizardData.is_vat_exempt}
                    onCheckedChange={(checked) => updateWizardData({ is_vat_exempt: checked as boolean })}
                  />
                  <Label htmlFor="is_vat_exempt" className="text-sm font-medium">
                    Zwolniony z VAT
                  </Label>
                </div>
                
                {wizardData.is_vat_exempt && (
                  <div className="space-y-2">
                    <Label htmlFor="vat_exemption_reason">Powód zwolnienia z VAT *</Label>
                    <Textarea
                      id="vat_exemption_reason"
                      value={wizardData.vat_exemption_reason}
                      onChange={(e) => updateWizardData({ vat_exemption_reason: e.target.value })}
                      placeholder="Opisz powód zwolnienia z VAT"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Działalność gospodarcza</CardTitle>
              <CardDescription>
                Informacje o profilu działalności i kodach PKD
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessStartDate">Data rozpoczęcia działalności</Label>
                  <Input
                    id="businessStartDate"
                    type="date"
                    value={wizardData.businessStartDate}
                    onChange={(e) => updateWizardData({ businessStartDate: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountingStartDate">Data rozpoczęcia prowadzenia księgowości</Label>
                  <Input
                    id="accountingStartDate"
                    type="date"
                    value={wizardData.accountingStartDate}
                    onChange={(e) => updateWizardData({ accountingStartDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Kody PKD *</Label>
                <PkdSelector
                  selectedCodes={wizardData.pkdCodes}
                  onCodesChange={(codes) => updateWizardData({ pkdCodes: codes })}
                />
                {wizardData.pkdCodes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {wizardData.pkdCodes.map((code, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Konto bankowe</CardTitle>
              <CardDescription>
                Dane konta bankowego do przelewów
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankAccount">Numer konta bankowego *</Label>
                  <Input
                    id="bankAccount"
                    value={wizardData.bankAccount}
                    onChange={(e) => updateWizardData({ bankAccount: e.target.value.replace(/\s/g, '') })}
                    placeholder="PL 1234 5678 9012 3456 7890 1234 5678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Wprowadź numer konta w formacie IBAN (bez spacji)
                  </p>
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bankName">Nazwa banku</Label>
                  <Input
                    id="bankName"
                    value={wizardData.bankName}
                    onChange={(e) => updateWizardData({ bankName: e.target.value })}
                    placeholder="np. Bank PKO BP S.A."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const step = STEPS.find(s => s.id === currentStep);
    return step ? step.title : '';
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return "Podstawowe informacje identyfikacyjne Twojej firmy";
      case 2:
        return "Ustawienia podatkowe i VAT";
      case 3:
        return "PKD i daty rozpoczęcia działalności";
      case 4:
        return "Dane do przelewów bankowych";
      default:
        return "";
    }
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={4}
      completedSteps={completedSteps}
      onStepClick={handleStepClick}
      onCancel={onCancel}
      companyType="jdg"
      title={getStepTitle()}
      subtitle={getStepSubtitle()}
    >
      <div className="space-y-6">
        {renderStepContent()}
        
        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onCancel : handleBack}
            disabled={loading}
          >
            {currentStep === 1 ? 'Anuluj' : (
              <>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wstecz
              </>
            )}
          </Button>
          
          <Button
            onClick={currentStep === 4 ? handleComplete : handleNext}
            disabled={!canProceed() || loading}
          >
            {loading ? 'Tworzenie...' : currentStep === 4 ? 'Utwórz profil' : (
              <>
                Dalej
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </OnboardingLayout>
  );
};
