import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { BusinessProfile } from '@/types';
import { format } from 'date-fns';

interface Nip8FormHelperProps {
  profile: BusinessProfile;
  onUpdate?: () => void;
}

interface Nip8FormData {
  // Section A - Company identification
  companyName: string;
  nip: string;
  regon: string;
  krs: string;
  
  // Section B - Addresses
  headquartersAddress: string;
  headquartersPostalCode: string;
  headquartersCity: string;
  
  correspondenceAddress: string;
  correspondencePostalCode: string;
  correspondenceCity: string;
  
  businessActivityAddress: string;
  businessActivityPostalCode: string;
  businessActivityCity: string;
  
  // Section C - PKD codes
  pkdMain: string;
  pkdMainDescription: string;
  pkdAdditional: string[];
  
  // Section D - Tax details
  vatPayer: boolean;
  vatExempt: boolean;
  vatExemptReason: string;
  
  // Section E - Accounting
  accountingMethod: 'ksiegi_rachunkowe' | 'uproszczona';
  fiscalYearEnd: string;
  
  // Section F - CIT
  citRate: 9 | 19;
  smallTaxpayer: boolean;
  
  // Section G - Contact
  email: string;
  phone: string;
}

export const Nip8FormHelper: React.FC<Nip8FormHelperProps> = ({ profile, onUpdate }) => {
  const [formData, setFormData] = useState<Nip8FormData>({
    companyName: profile.name || '',
    nip: profile.taxId || '',
    regon: profile.regon || '',
    krs: profile.krs_number || '',
    
    headquartersAddress: profile.headquarters_address || profile.address || '',
    headquartersPostalCode: profile.headquarters_postal_code || profile.postalCode || '',
    headquartersCity: profile.headquarters_city || profile.city || '',
    
    correspondenceAddress: profile.correspondence_address || '',
    correspondencePostalCode: profile.correspondence_postal_code || '',
    correspondenceCity: profile.correspondence_city || '',
    
    businessActivityAddress: profile.business_activity_address || '',
    businessActivityPostalCode: profile.business_activity_postal_code || '',
    businessActivityCity: profile.business_activity_city || '',
    
    pkdMain: profile.pkd_main || '',
    pkdMainDescription: '',
    pkdAdditional: [],
    
    vatPayer: profile.vat_status === 'vat' || profile.vat_status === 'vat_ue',
    vatExempt: profile.is_vat_exempt || false,
    vatExemptReason: profile.vat_exemption_reason || '',
    
    accountingMethod: (profile.accounting_method as 'ksiegi_rachunkowe' | 'uproszczona') || 'ksiegi_rachunkowe',
    fiscalYearEnd: profile.fiscal_year_end_month ? `${profile.fiscal_year_end_month}` : '12',
    
    citRate: ((profile.cit_rate as 9 | 19) ?? 9),
    smallTaxpayer: false,
    
    email: profile.email || '',
    phone: profile.phone || '',
  });

  const [isFiled, setIsFiled] = useState(profile.nip_8_filed || false);
  const [filedDate, setFiledDate] = useState(profile.nip_8_filed_date || '');
  const [uploading, setUploading] = useState(false);

  const handleInputChange = (field: keyof Nip8FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveData = async () => {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          name: formData.companyName,
          tax_id: formData.nip,
          regon: formData.regon,
          krs_number: formData.krs,
          
          headquarters_address: formData.headquartersAddress,
          headquarters_postal_code: formData.headquartersPostalCode,
          headquarters_city: formData.headquartersCity,
          
          correspondence_address: formData.correspondenceAddress,
          correspondence_postal_code: formData.correspondencePostalCode,
          correspondence_city: formData.correspondenceCity,
          
          business_activity_address: formData.businessActivityAddress,
          business_activity_postal_code: formData.businessActivityPostalCode,
          business_activity_city: formData.businessActivityCity,
          
          pkd_main: formData.pkdMain,
          vat_status: formData.vatPayer ? 'vat' : 'none',
          is_vat_exempt: formData.vatExempt,
          vat_exemption_reason: formData.vatExemptReason,
          
          accounting_method: formData.accountingMethod,
          fiscal_year_end_month: parseInt(formData.fiscalYearEnd),
          cit_rate: formData.citRate,
          
          email: formData.email,
          phone: formData.phone,
          
          registry_data_changed_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Dane zapisane pomyślnie');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving NIP-8 data:', error);
      toast.error('Błąd zapisu danych');
    }
  };

  const handleMarkAsFiled = async () => {
    try {
      const { error } = await supabase
        .from('business_profiles')
        .update({
          nip_8_filed: true,
          nip_8_filed_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', profile.id);

      if (error) throw error;
      setIsFiled(true);
      setFiledDate(new Date().toISOString().split('T')[0]);
      toast.success('NIP-8 oznaczony jako złożony');
      onUpdate?.();
    } catch (error) {
      console.error('Error marking NIP-8 as filed:', error);
      toast.error('Błąd aktualizacji statusu');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Formularz NIP-8 - Zgłoszenie identyfikacyjne / aktualizacyjne
          </CardTitle>
          <CardDescription>
            Wypełnij dane na podstawie informacji z KRS i dokumentów założycielskich
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFiled ? (
            <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">NIP-8 złożony</p>
                <p className="text-sm text-green-700">Data złożenia: {filedDate ? format(new Date(filedDate), 'dd.MM.yyyy') : 'brak daty'}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">NIP-8 nie został jeszcze złożony</p>
                <p className="text-sm text-amber-700">Wypełnij formularz i oznacz jako złożony po wysłaniu do US</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section A - Company Identification */}
      <Card>
        <CardHeader>
          <CardTitle>A. Identyfikacja podatnika</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Pełna nazwa spółki</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              placeholder="np. Example Sp. z o.o."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="nip">NIP</Label>
              <Input
                id="nip"
                value={formData.nip}
                onChange={(e) => handleInputChange('nip', e.target.value)}
                placeholder="1234567890"
              />
            </div>
            <div>
              <Label htmlFor="regon">REGON</Label>
              <Input
                id="regon"
                value={formData.regon}
                onChange={(e) => handleInputChange('regon', e.target.value)}
                placeholder="123456789"
              />
            </div>
            <div>
              <Label htmlFor="krs">KRS</Label>
              <Input
                id="krs"
                value={formData.krs}
                onChange={(e) => handleInputChange('krs', e.target.value)}
                placeholder="0000123456"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section B - Addresses */}
      <Card>
        <CardHeader>
          <CardTitle>B. Adresy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Headquarters */}
          <div className="space-y-4">
            <h4 className="font-medium">Siedziba spółki</h4>
            <div>
              <Label htmlFor="hqAddress">Ulica i numer</Label>
              <Input
                id="hqAddress"
                value={formData.headquartersAddress}
                onChange={(e) => handleInputChange('headquartersAddress', e.target.value)}
                placeholder="ul. Przykładowa 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hqPostal">Kod pocztowy</Label>
                <Input
                  id="hqPostal"
                  value={formData.headquartersPostalCode}
                  onChange={(e) => handleInputChange('headquartersPostalCode', e.target.value)}
                  placeholder="00-000"
                />
              </div>
              <div>
                <Label htmlFor="hqCity">Miejscowość</Label>
                <Input
                  id="hqCity"
                  value={formData.headquartersCity}
                  onChange={(e) => handleInputChange('headquartersCity', e.target.value)}
                  placeholder="Warszawa"
                />
              </div>
            </div>
          </div>

          {/* Correspondence Address */}
          <div className="space-y-4">
            <h4 className="font-medium">Adres do korespondencji (jeśli inny)</h4>
            <div>
              <Label htmlFor="corrAddress">Ulica i numer</Label>
              <Input
                id="corrAddress"
                value={formData.correspondenceAddress}
                onChange={(e) => handleInputChange('correspondenceAddress', e.target.value)}
                placeholder="ul. Korespondencyjna 2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="corrPostal">Kod pocztowy</Label>
                <Input
                  id="corrPostal"
                  value={formData.correspondencePostalCode}
                  onChange={(e) => handleInputChange('correspondencePostalCode', e.target.value)}
                  placeholder="00-000"
                />
              </div>
              <div>
                <Label htmlFor="corrCity">Miejscowość</Label>
                <Input
                  id="corrCity"
                  value={formData.correspondenceCity}
                  onChange={(e) => handleInputChange('correspondenceCity', e.target.value)}
                  placeholder="Warszawa"
                />
              </div>
            </div>
          </div>

          {/* Business Activity Address */}
          <div className="space-y-4">
            <h4 className="font-medium">Adres prowadzenia działalności (jeśli inny)</h4>
            <div>
              <Label htmlFor="bizAddress">Ulica i numer</Label>
              <Input
                id="bizAddress"
                value={formData.businessActivityAddress}
                onChange={(e) => handleInputChange('businessActivityAddress', e.target.value)}
                placeholder="ul. Biurowa 3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bizPostal">Kod pocztowy</Label>
                <Input
                  id="bizPostal"
                  value={formData.businessActivityPostalCode}
                  onChange={(e) => handleInputChange('businessActivityPostalCode', e.target.value)}
                  placeholder="00-000"
                />
              </div>
              <div>
                <Label htmlFor="bizCity">Miejscowość</Label>
                <Input
                  id="bizCity"
                  value={formData.businessActivityCity}
                  onChange={(e) => handleInputChange('businessActivityCity', e.target.value)}
                  placeholder="Warszawa"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section C - PKD Codes */}
      <Card>
        <CardHeader>
          <CardTitle>C. Przedmiot działalności (PKD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pkdMain">Przeważający kod PKD</Label>
            <Input
              id="pkdMain"
              value={formData.pkdMain}
              onChange={(e) => handleInputChange('pkdMain', e.target.value)}
              placeholder="62.01.Z"
            />
          </div>
          <div>
            <Label htmlFor="pkdMainDesc">Opis działalności</Label>
            <Textarea
              id="pkdMainDesc"
              value={formData.pkdMainDescription}
              onChange={(e) => handleInputChange('pkdMainDescription', e.target.value)}
              placeholder="Działalność związana z oprogramowaniem"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section D - VAT */}
      <Card>
        <CardHeader>
          <CardTitle>D. VAT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vatPayer"
              checked={formData.vatPayer}
              onCheckedChange={(checked) => handleInputChange('vatPayer', checked)}
            />
            <Label htmlFor="vatPayer">Czynny podatnik VAT</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="vatExempt"
              checked={formData.vatExempt}
              onCheckedChange={(checked) => handleInputChange('vatExempt', checked)}
            />
            <Label htmlFor="vatExempt">Zwolniony z VAT (art. 113)</Label>
          </div>
          
          {formData.vatExempt && (
            <div>
              <Label htmlFor="vatExemptReason">Podstawa prawna zwolnienia</Label>
              <Input
                id="vatExemptReason"
                value={formData.vatExemptReason}
                onChange={(e) => handleInputChange('vatExemptReason', e.target.value)}
                placeholder="art. 113 ust. 1 ustawy o VAT"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section E - Accounting */}
      <Card>
        <CardHeader>
          <CardTitle>E. Księgowość</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="accountingMethod">Forma księgowości</Label>
            <Select
              value={formData.accountingMethod}
              onValueChange={(value) => handleInputChange('accountingMethod', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ksiegi_rachunkowe">Pełna księgowość (księgi rachunkowe)</SelectItem>
                <SelectItem value="uproszczona">Uproszczona księgowość</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="fiscalYearEnd">Koniec roku obrotowego (miesiąc)</Label>
            <Select
              value={formData.fiscalYearEnd}
              onValueChange={(value) => handleInputChange('fiscalYearEnd', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section F - CIT */}
      <Card>
        <CardHeader>
          <CardTitle>F. Podatek CIT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="citRate">Stawka CIT</Label>
            <Select
              value={formData.citRate.toString()}
              onValueChange={(value) => handleInputChange('citRate', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="19">19% (standardowa)</SelectItem>
                <SelectItem value="9">9% (mały podatnik)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smallTaxpayer"
              checked={formData.smallTaxpayer}
              onCheckedChange={(checked) => handleInputChange('smallTaxpayer', checked)}
            />
            <Label htmlFor="smallTaxpayer">Mały podatnik (przychody {'<'} 2 mln EUR)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Section G - Contact */}
      <Card>
        <CardHeader>
          <CardTitle>G. Dane kontaktowe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="kontakt@firma.pl"
            />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+48 123 456 789"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSaveData} variant="default">
              Zapisz dane
            </Button>
            <Button onClick={handlePrint} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Drukuj / Zapisz jako PDF
            </Button>
            {!isFiled && (
              <Button onClick={handleMarkAsFiled} variant="secondary">
                <CheckCircle className="h-4 w-4 mr-2" />
                Oznacz jako złożony
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Po wypełnieniu formularza możesz go wydrukować (Ctrl+P) lub zapisać jako PDF. 
            Następnie złóż go w Urzędzie Skarbowym lub przez e-US.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Nip8FormHelper;
