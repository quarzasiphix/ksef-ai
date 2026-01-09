import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useAuth } from '@/shared/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createFuneralCase } from '../data/funeralCaseRepository';
import type { FuneralServiceType, DeceasedPerson, FuneralClient } from '../types/funeralCases';
import { FUNERAL_SERVICE_TYPE_LABELS } from '../types/funeralCases';

const FuneralCaseNewPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProjectId } = useProjectScope();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [deceased, setDeceased] = useState<DeceasedPerson>({
    first_name: '',
    last_name: '',
    date_of_death: '',
    place_of_death: '',
    date_of_birth: '',
    pesel: '',
    usc_location: '',
  });

  const [client, setClient] = useState<FuneralClient>({
    name: '',
    relationship: '',
    phone: '',
    email: '',
    address: '',
    pesel: '',
  });

  const [serviceType, setServiceType] = useState<FuneralServiceType>('traditional');
  const [ceremonyDate, setCeremonyDate] = useState('');
  const [ceremonyTime, setCeremonyTime] = useState('');
  const [ceremonyLocation, setCeremonyLocation] = useState('');
  const [burialLocation, setBurialLocation] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProfileId || !user) {
      toast.error('Brak wybranego profilu biznesowego');
      return;
    }

    if (!deceased.first_name || !deceased.last_name || !deceased.date_of_death) {
      toast.error('Wypełnij wymagane dane zmarłego');
      return;
    }

    if (!client.name) {
      toast.error('Wypełnij dane zleceniodawcy');
      return;
    }

    try {
      setLoading(true);

      const newCase = await createFuneralCase({
        business_profile_id: selectedProfileId,
        department_id: selectedProjectId || undefined,
        deceased,
        client,
        service_type: serviceType,
        ceremony_date: ceremonyDate || undefined,
        ceremony_time: ceremonyTime || undefined,
        ceremony_location: ceremonyLocation || undefined,
        burial_location: burialLocation || undefined,
        total_amount: totalAmount,
        description: description || undefined,
        created_by: user.id,
      });

      toast.success('Sprawa pogrzebowa utworzona');
      navigate(`/operations/funeral-cases/${newCase.id}`);
    } catch (error) {
      console.error('Error creating funeral case:', error);
      toast.error('Błąd podczas tworzenia sprawy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operations/funeral-cases')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Powrót
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nowa sprawa pogrzebowa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Wprowadź dane zmarłego i zleceniodawcy
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deceased Person Data */}
        <Card>
          <CardHeader>
            <CardTitle>Dane zmarłego</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Imię *</Label>
                <Input
                  value={deceased.first_name}
                  onChange={(e) => setDeceased({ ...deceased, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Nazwisko *</Label>
                <Input
                  value={deceased.last_name}
                  onChange={(e) => setDeceased({ ...deceased, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data zgonu *</Label>
                <Input
                  type="date"
                  value={deceased.date_of_death}
                  onChange={(e) => setDeceased({ ...deceased, date_of_death: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Miejsce zgonu</Label>
                <Input
                  value={deceased.place_of_death}
                  onChange={(e) => setDeceased({ ...deceased, place_of_death: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data urodzenia</Label>
                <Input
                  type="date"
                  value={deceased.date_of_birth}
                  onChange={(e) => setDeceased({ ...deceased, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label>PESEL</Label>
                <Input
                  value={deceased.pesel}
                  onChange={(e) => setDeceased({ ...deceased, pesel: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Urząd Stanu Cywilnego</Label>
              <Input
                value={deceased.usc_location}
                onChange={(e) => setDeceased({ ...deceased, usc_location: e.target.value })}
                placeholder="np. USC Warszawa Śródmieście"
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Data */}
        <Card>
          <CardHeader>
            <CardTitle>Zleceniodawca (rodzina)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Imię i nazwisko *</Label>
                <Input
                  value={client.name}
                  onChange={(e) => setClient({ ...client, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Stopień pokrewieństwa</Label>
                <Input
                  value={client.relationship}
                  onChange={(e) => setClient({ ...client, relationship: e.target.value })}
                  placeholder="np. syn, córka, małżonek"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefon</Label>
                <Input
                  type="tel"
                  value={client.phone}
                  onChange={(e) => setClient({ ...client, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={client.email}
                  onChange={(e) => setClient({ ...client, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Adres</Label>
              <Input
                value={client.address}
                onChange={(e) => setClient({ ...client, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card>
          <CardHeader>
            <CardTitle>Szczegóły usługi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Typ usługi</Label>
              <Select value={serviceType} onValueChange={(value: FuneralServiceType) => setServiceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNERAL_SERVICE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data ceremonii</Label>
                <Input
                  type="date"
                  value={ceremonyDate}
                  onChange={(e) => setCeremonyDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Godzina ceremonii</Label>
                <Input
                  type="time"
                  value={ceremonyTime}
                  onChange={(e) => setCeremonyTime(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Miejsce ceremonii</Label>
              <Input
                value={ceremonyLocation}
                onChange={(e) => setCeremonyLocation(e.target.value)}
                placeholder="np. Kościół pw. Św. Jana, ul. Przykładowa 1"
              />
            </div>

            <div>
              <Label>Miejsce pochówku</Label>
              <Input
                value={burialLocation}
                onChange={(e) => setBurialLocation(e.target.value)}
                placeholder="np. Cmentarz Powązkowski, kwatera 12"
              />
            </div>

            <div>
              <Label>Wartość usługi (PLN)</Label>
              <Input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Opis / Uwagi</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Dodatkowe informacje o sprawie..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/operations/funeral-cases')}
          >
            Anuluj
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Tworzenie...' : 'Utwórz sprawę'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FuneralCaseNewPage;
