import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, Briefcase, FolderOpen, CheckCircle2, 
  ArrowRight, ArrowLeft, FileText, Shield, DollarSign 
} from 'lucide-react';
import { toast } from 'sonner';
import { saveBusinessProfile } from '@/integrations/supabase/repositories/businessProfileRepository';
import { createFolder, initializeDefaultFolders } from '@/integrations/supabase/repositories/documentsRepository';
import { initializeFoundationalDecisions } from '@/integrations/supabase/repositories/decisionsRepository';
import type { BusinessProfile } from '@/types';
import { useAuth } from '@/hooks/useAuth';

interface SpoolkaWizardProps {
  onComplete?: (profileId: string) => void;
  onCancel?: () => void;
  initialCompanyType?: 'sp_zoo' | 'sa';
}

interface WizardData {
  // Step 1: Company Type & Basic Info
  companyType: 'sp_zoo' | 'sa' | 'sp_jawna' | 'sp_komandytowa' | 'sp_partnerska';
  registrationMethod: 's24' | 'notary' | 'other' | '';
  name: string;
  taxId: string;
  krsNumber: string;
  address: string;
  postalCode: string;
  city: string;
  shareCapital: string;
  establishmentDate: string;
  
  // Step 2: Wspólnicy (Shareholders)
  shareholders: Array<{
    name: string;
    shares: number;
    shareValue: number;
  }>;
  
  // Step 3: Zarząd (Board Members)
  boardMembers: Array<{
    name: string;
    position: 'management' | 'supervisory';
    pesel: string;
  }>;
  
  
  // Step 5: Services/Activities
  services: string[];
  pkdMain: string;
  
  // Step 6: Document Storage Needs
  documentStorageNeeds: string[];
  needsBucketStorage: boolean;
  
  // Step 7: Folder Setup & Recommendations
  customFolders: string[];
  recommendedDocuments: string[];
}

const STEPS = [
  { id: 1, title: 'Typ spółki', icon: Building2 },
  { id: 2, title: 'Wspólnicy', icon: Users },
  { id: 3, title: 'Zarząd', icon: Shield },
  { id: 4, title: 'Potrzeby dokumentowe', icon: FileText },
  { id: 5, title: 'Usługi', icon: Briefcase },
  { id: 6, title: 'Konfiguracja', icon: FolderOpen },
];

const DOCUMENT_STORAGE_NEEDS = [
  { id: 'contracts', label: 'Umowy handlowe', description: 'Z kontrahentami, dostawcami, klientami' },
  { id: 'resolutions', label: 'Uchwały wspólników/zarządu', description: 'Protokoły, decyzje' },
  { id: 'krs', label: 'Dokumenty KRS', description: 'Wypisy, zmiany, aktualizacje' },
  { id: 'licenses', label: 'Licencje i zezwolenia', description: 'Koncesje, pozwolenia' },
  { id: 'tax', label: 'Dokumenty podatkowe', description: 'Deklaracje, PIT, CIT, VAT' },
  { id: 'court', label: 'Korespondencja sądowa', description: 'Pisma, orzeczenia' },
  { id: 'employment', label: 'Umowy o pracę', description: 'Pracownicy, zleceniobiorcy' },
  { id: 'board', label: 'Dokumenty zarządu', description: 'Umowy członków zarządu' },
  { id: 'financial', label: 'Sprawozdania finansowe', description: 'Bilanse, rachunki zysków i strat' },
  { id: 'company_docs', label: 'Umowa spółki i statut', description: 'Dokumenty założycielskie' },
];

const RECOMMENDED_DOCUMENTS = [
  { id: 'company_agreement', label: 'Umowa spółki', priority: 'high', description: 'Podstawowy dokument założycielski' },
  { id: 'statute', label: 'Statut (dla SA)', priority: 'high', description: 'Wymagany dla spółek akcyjnych' },
  { id: 'krs_extract', label: 'Aktualny wypis z KRS', priority: 'high', description: 'Nie starszy niż 3 miesiące' },
  { id: 'nip_cert', label: 'Zaświadczenie o NIP', priority: 'medium', description: 'Z urzędu skarbowego' },
  { id: 'regon_cert', label: 'Zaświadczenie o REGON', priority: 'medium', description: 'Z GUS' },
  { id: 'board_appointments', label: 'Uchwały powołujące zarząd', priority: 'high', description: 'Aktualne składy zarządu i rady' },
  { id: 'share_register', label: 'Księga udziałów/akcji', priority: 'high', description: 'Rejestr wspólników/akcjonariuszy' },
  { id: 'vat_registration', label: 'Zgłoszenie VAT-R', priority: 'medium', description: 'Jeśli jesteś czynnym podatnikiem VAT' },
];

const DEFAULT_FOLDERS = [
  'Umowy',
  'Uchwały',
  'KRS',
  'Licencje',
  'Dokumenty zarządu',
  'Dokumenty wspólników',
  'Korespondencja',
];

export const SpoolkaWizard: React.FC<SpoolkaWizardProps> = ({ onComplete, onCancel, initialCompanyType }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const hasLoadedDraftRef = useRef(false);
  
  const [wizardData, setWizardData] = useState<WizardData>({
    companyType: 'sp_zoo' as 'sp_zoo' | 'sa' | 'sp_jawna' | 'sp_komandytowa' | 'sp_partnerska',
    registrationMethod: '',
    name: '',
    taxId: '',
    krsNumber: '',
    address: '',
    postalCode: '',
    city: '',
    shareCapital: '',
    establishmentDate: '',
    shareholders: [{ name: '', shares: 100, shareValue: 0 }],
    boardMembers: [{ name: '', position: 'management', pesel: '' }],
    documentStorageNeeds: ['contracts', 'resolutions', 'krs', 'company_docs'],
    needsBucketStorage: true,
    services: [],
    pkdMain: '',
    customFolders: [...DEFAULT_FOLDERS],
    recommendedDocuments: ['company_agreement', 'krs_extract', 'board_appointments', 'share_register'],
  });

  const updateData = (field: keyof WizardData, value: any) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const companyTypeLocked = !!initialCompanyType;

  useEffect(() => {
    if (!initialCompanyType) return;
    setWizardData(prev => ({ ...prev, companyType: initialCompanyType }));
  }, [initialCompanyType]);

  const draftKey = user?.id
    ? `onboarding:spoolka:${user.id}:${initialCompanyType ?? 'unlocked'}`
    : null;

  useEffect(() => {
    if (!draftKey) return;
    if (typeof window === 'undefined') return;

    const rawDraft = localStorage.getItem(draftKey);
    if (!rawDraft) {
      hasLoadedDraftRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as Partial<{ wizardData: WizardData; currentStep: number }>;
      if (parsed.wizardData) {
        setWizardData(prev => {
          const next = { ...prev, ...parsed.wizardData } as WizardData;
          if (initialCompanyType) {
            next.companyType = initialCompanyType;
          }
          return next;
        });
      }

      if (typeof parsed.currentStep === 'number' && parsed.currentStep >= 1 && parsed.currentStep <= STEPS.length) {
        setCurrentStep(parsed.currentStep);
      }
    } catch {
    } finally {
      hasLoadedDraftRef.current = true;
    }
  }, [draftKey, initialCompanyType]);

  useEffect(() => {
    if (!draftKey) return;
    if (typeof window === 'undefined') return;
    if (!hasLoadedDraftRef.current) return;

    localStorage.setItem(draftKey, JSON.stringify({ wizardData, currentStep }));
  }, [draftKey, wizardData, currentStep]);

  const progress = (currentStep / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Create business profile
      // Map company type to entity type (currently only sp_zoo and sa are supported in DB)
      const entityType = wizardData.companyType === 'sa' ? 'sa' : 'sp_zoo';
      
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
        entityType: entityType,
        krs_number: wizardData.krsNumber,
        share_capital: parseFloat(wizardData.shareCapital) || 0,
        establishment_date: wizardData.establishmentDate,
        pkd_main: wizardData.pkdMain,
        user_id: user.id, // CRITICAL: Add user_id for RLS policy
      };

      const savedProfile = await saveBusinessProfile(profile as BusinessProfile);
      
      // Initialize default folders
      if (savedProfile.id) {
        await initializeDefaultFolders(savedProfile.id);

        // Initialize foundational decisions (6 base mandates)
        await initializeFoundationalDecisions(savedProfile.id);

        // Create user-configured folders from the wizard (best-effort, ignore duplicates)
        const uniqueFolderNames = Array.from(
          new Set((wizardData.customFolders || []).map(f => (f || '').trim()).filter(Boolean))
        );

        for (const name of uniqueFolderNames) {
          try {
            await createFolder({
              business_profile_id: savedProfile.id,
              name,
              folder_type: 'custom',
            });
          } catch (e: any) {
            // Ignore unique constraint violations (folder already exists)
            if (e?.code === '23505') continue;
          }
        }
        
        toast.success('Spółka utworzona pomyślnie!');

        if (draftKey && typeof window !== 'undefined') {
          localStorage.removeItem(draftKey);
        }
        
        if (onComplete) {
          onComplete(savedProfile.id);
        } else {
          navigate('/accounting');
        }
      }
    } catch (error) {
      console.error('Error creating spółka:', error);
      toast.error('Błąd tworzenia spółki');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo data={wizardData} updateData={updateData} companyTypeLocked={companyTypeLocked} />;
      case 2:
        return <Step2Shareholders data={wizardData} updateData={updateData} />;
      case 3:
        return <Step3BoardMembers data={wizardData} updateData={updateData} />;
      case 4:
        return <Step4DocumentStorageNeeds data={wizardData} updateData={updateData} />;
      case 5:
        return <Step5Services data={wizardData} updateData={updateData} />;
      case 6:
        return <Step6FolderSetup data={wizardData} updateData={updateData} />;
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!(wizardData.companyType && wizardData.registrationMethod && wizardData.name && wizardData.taxId && wizardData.krsNumber);
      case 2:
        return wizardData.shareholders.length > 0 && wizardData.shareholders.every(s => s.name);
      case 3:
        return wizardData.boardMembers.length > 0 && wizardData.boardMembers.every(b => b.name);
      case 4:
        return wizardData.documentStorageNeeds.length > 0;
      case 5:
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Kreator nowej spółki</h2>
          <span className="text-sm text-muted-foreground">
            Krok {currentStep} z {STEPS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`flex flex-col items-center ${
              index < STEPS.length - 1 ? 'flex-1' : ''
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step.id === currentStep
                  ? 'border-primary bg-primary text-primary-foreground'
                  : step.id < currentStep
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-muted bg-background text-muted-foreground'
              }`}
            >
              {step.id < currentStep ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <span className="text-xs mt-2 text-center hidden md:block">{step.title}</span>
            {index < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-muted mx-2 mt-5 hidden md:block" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handleBack}
          disabled={loading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Anuluj' : 'Wstecz'}
        </Button>
        
        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed() || loading}>
            Dalej
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleComplete} disabled={!canProceed() || loading}>
            {loading ? 'Tworzenie...' : 'Zakończ'}
            <CheckCircle2 className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Step 1: Company Type & Basic Info
const Step1BasicInfo: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
  companyTypeLocked?: boolean;
}> = ({ data, updateData, companyTypeLocked }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Jaki rodzaj spółki prowadzisz?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Wybierz typ spółki i wprowadź podstawowe dane
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyType">Typ spółki *</Label>
        <Select
          value={data.companyType}
          onValueChange={(value) => updateData('companyType', value)}
          disabled={companyTypeLocked}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sp_zoo">Spółka z ograniczoną odpowiedzialnością (Sp. z o.o.)</SelectItem>
            <SelectItem value="sa">Spółka akcyjna (S.A.)</SelectItem>
            <SelectItem value="sp_jawna">Spółka jawna</SelectItem>
            <SelectItem value="sp_komandytowa">Spółka komandytowa</SelectItem>
            <SelectItem value="sp_partnerska">Spółka partnerska</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="registrationMethod">Rejestracja spółki *</Label>
        <Select
          value={data.registrationMethod}
          onValueChange={(value) => updateData('registrationMethod', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Wybierz sposób rejestracji" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="s24">S24</SelectItem>
            <SelectItem value="notary">Notariusz</SelectItem>
            <SelectItem value="other">Inne</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          To pomoże nam zaproponować odpowiednie dokumenty (np. umowa spółki / statut).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nazwa spółki *</Label>
          <Input
            id="name"
            placeholder="np. ABC Sp. z o.o."
            value={data.name}
            onChange={(e) => updateData('name', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxId">NIP *</Label>
          <Input
            id="taxId"
            placeholder="1234567890"
            value={data.taxId}
            onChange={(e) => updateData('taxId', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="krsNumber">Numer KRS *</Label>
          <Input
            id="krsNumber"
            placeholder="0000123456"
            value={data.krsNumber}
            onChange={(e) => updateData('krsNumber', e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adres siedziby</Label>
          <Input
            id="address"
            placeholder="ul. Przykładowa 1"
            value={data.address}
            onChange={(e) => updateData('address', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Kod pocztowy</Label>
          <Input
            id="postalCode"
            placeholder="00-000"
            value={data.postalCode}
            onChange={(e) => updateData('postalCode', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city">Miasto</Label>
          <Input
            id="city"
            placeholder="Warszawa"
            value={data.city}
            onChange={(e) => updateData('city', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="shareCapital">Kapitał zakładowy (PLN)</Label>
          <Input
            id="shareCapital"
            type="number"
            placeholder="5000"
            value={data.shareCapital}
            onChange={(e) => updateData('shareCapital', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="establishmentDate">Data powstania</Label>
          <Input
            id="establishmentDate"
            type="date"
            value={data.establishmentDate}
            onChange={(e) => updateData('establishmentDate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

// Step 2: Shareholders
const Step2Shareholders: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}> = ({ data, updateData }) => {
  const addShareholder = () => {
    updateData('shareholders', [...data.shareholders, { name: '', shares: 0, shareValue: 0 }]);
  };

  const removeShareholder = (index: number) => {
    const updated = data.shareholders.filter((_, i) => i !== index);
    updateData('shareholders', updated);
  };

  const updateShareholder = (index: number, field: string, value: any) => {
    const updated = [...data.shareholders];
    updated[index] = { ...updated[index], [field]: value };
    updateData('shareholders', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Wspólnicy</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Dodaj wspólników spółki i ich udziały
        </p>
      </div>

      <div className="space-y-4">
        {data.shareholders.map((shareholder, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Imię i nazwisko / Nazwa</Label>
                  <Input
                    placeholder="Jan Kowalski"
                    value={shareholder.name}
                    onChange={(e) => updateShareholder(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Udział (%)</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={shareholder.shares}
                    onChange={(e) => {
                      const raw = e.target.value;
                      updateShareholder(index, 'shares', raw === '' ? 0 : Number(raw));
                    }}
                  />
                </div>
              </div>
              {data.shareholders.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-600"
                  onClick={() => removeShareholder(index)}
                >
                  Usuń wspólnika
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addShareholder} variant="outline" className="w-full">
        <Users className="h-4 w-4 mr-2" />
        Dodaj wspólnika
      </Button>
    </div>
  );
};

// Step 3: Board Members
const Step3BoardMembers: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}> = ({ data, updateData }) => {
  const addBoardMember = () => {
    updateData('boardMembers', [...data.boardMembers, { name: '', position: 'management', pesel: '' }]);
  };

  const removeBoardMember = (index: number) => {
    const updated = data.boardMembers.filter((_, i) => i !== index);
    updateData('boardMembers', updated);
  };

  const updateBoardMember = (index: number, field: string, value: any) => {
    const updated = [...data.boardMembers];
    updated[index] = { ...updated[index], [field]: value };
    updateData('boardMembers', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Zarząd i Rada Nadzorcza</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Dodaj członków zarządu i rady nadzorczej
        </p>
      </div>

      <div className="space-y-4">
        {data.boardMembers.map((member, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Imię i nazwisko</Label>
                  <Input
                    placeholder="Jan Kowalski"
                    value={member.name}
                    onChange={(e) => updateBoardMember(index, 'name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stanowisko</Label>
                  <Select
                    value={member.position}
                    onValueChange={(value) => updateBoardMember(index, 'position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="management">Zarząd</SelectItem>
                      <SelectItem value="supervisory">Rada Nadzorcza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PESEL (opcjonalnie)</Label>
                  <Input
                    placeholder="12345678901"
                    value={member.pesel}
                    onChange={(e) => updateBoardMember(index, 'pesel', e.target.value)}
                  />
                </div>
              </div>
              {data.boardMembers.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-600"
                  onClick={() => removeBoardMember(index)}
                >
                  Usuń członka
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={addBoardMember} variant="outline" className="w-full">
        <Shield className="h-4 w-4 mr-2" />
        Dodaj członka zarządu/rady
      </Button>
    </div>
  );
};

// Step 4: Document Storage Needs
const Step4DocumentStorageNeeds: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}> = ({ data, updateData }) => {
  const toggleNeed = (needId: string) => {
    const updated = data.documentStorageNeeds.includes(needId)
      ? data.documentStorageNeeds.filter(n => n !== needId)
      : [...data.documentStorageNeeds, needId];
    updateData('documentStorageNeeds', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Jakie dokumenty będziesz przechowywać?</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Wybierz rodzaje dokumentów, które chcesz zarządzać w systemie. Na podstawie tego utworzymy odpowiednią strukturę folderów.
        </p>
      </div>

      <div className="space-y-3">
        {DOCUMENT_STORAGE_NEEDS.map((need) => (
          <Card key={need.id} className={data.documentStorageNeeds.includes(need.id) ? 'border-primary' : ''}>
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={need.id}
                  checked={data.documentStorageNeeds.includes(need.id)}
                  onCheckedChange={() => toggleNeed(need.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={need.id} className="cursor-pointer font-medium">
                    {need.label}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">{need.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Przechowywanie w chmurze</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Wybrane kategorie dokumentów będą dostępne w bezpiecznej przestrzeni dyskowej. Możesz przesyłać pliki PDF i inne dokumenty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step 5: Services
const Step5Services: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}> = ({ data, updateData }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Usługi i działalność</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Określ główną działalność spółki
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pkdMain">Główny kod PKD</Label>
          <Input
            id="pkdMain"
            placeholder="62.01.Z"
            value={data.pkdMain}
            onChange={(e) => updateData('pkdMain', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Wprowadź główny kod PKD działalności spółki
          </p>
        </div>
      </div>
    </div>
  );
};

// Step 6: Folder Setup & Document Recommendations
const Step6FolderSetup: React.FC<{
  data: WizardData;
  updateData: (field: keyof WizardData, value: any) => void;
}> = ({ data, updateData }) => {
  const toggleFolder = (folder: string) => {
    const updated = data.customFolders.includes(folder)
      ? data.customFolders.filter(f => f !== folder)
      : [...data.customFolders, folder];
    updateData('customFolders', updated);
  };

  const toggleRecommendedDoc = (docId: string) => {
    const updated = data.recommendedDocuments.includes(docId)
      ? data.recommendedDocuments.filter(d => d !== docId)
      : [...data.recommendedDocuments, docId];
    updateData('recommendedDocuments', updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Konfiguracja końcowa</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Ostatnie kroki przed utworzeniem spółki w systemie
        </p>
      </div>

      {/* Folder Structure */}
      <div className="space-y-4">
        <h4 className="font-medium">Struktura folderów</h4>
        <p className="text-sm text-muted-foreground">
          Wybierz foldery, które zostaną utworzone automatycznie
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEFAULT_FOLDERS.map((folder) => (
            <div key={folder} className="flex items-center space-x-2">
              <Checkbox
                id={folder}
                checked={data.customFolders.includes(folder)}
                onCheckedChange={() => toggleFolder(folder)}
              />
              <Label htmlFor={folder} className="cursor-pointer">
                <FolderOpen className="h-4 w-4 inline mr-2" />
                {folder}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Documents */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
          <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900 dark:text-amber-100">Zalecane dokumenty do dodania</h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Polecamy przesłać te dokumenty do systemu dla lepszego zarządzania spółką
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {RECOMMENDED_DOCUMENTS.map((doc) => {
            const isHighPriority = doc.priority === 'high';
            return (
              <Card key={doc.id} className={isHighPriority ? 'border-amber-300 dark:border-amber-700' : ''}>
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={doc.id}
                      checked={data.recommendedDocuments.includes(doc.id)}
                      onCheckedChange={() => toggleRecommendedDoc(doc.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={doc.id} className="cursor-pointer font-medium">
                          {doc.label}
                        </Label>
                        {isHighPriority && (
                          <Badge variant="destructive" className="text-xs">Ważne</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          💡 <strong>Wskazówka:</strong> Możesz później dodać, usunąć lub zmienić nazwy folderów w sekcji Dokumenty. Zalecane dokumenty pomogą Ci w pełni wykorzystać system zarządzania spółką.
        </p>
      </div>
    </div>
  );
};

export default SpoolkaWizard;
