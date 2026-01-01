import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Plus, ArrowLeft, Truck, AlertTriangle } from 'lucide-react';
import { getVehicles } from '../data/operationsRepository';
import type { Vehicle } from '../types';

const statusBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Dostępny', variant: 'default' },
  in_use: { label: 'W użyciu', variant: 'secondary' },
  maintenance: { label: 'Serwis', variant: 'outline' },
  out_of_service: { label: 'Niedostępny', variant: 'destructive' },
};

const VehiclesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();

  const { data: vehicles = [], isLoading, isError } = useQuery<Vehicle[]>({
    queryKey: ['vehicles', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getVehicles(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && !!selectedProfileId,
  });

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-60" />
            <h3 className="text-lg font-semibold mb-2">Wybierz dział, aby zarządzać flotą</h3>
            <p className="text-muted-foreground mb-4">Pojazdy są powiązane z konkretnym działem operacyjnym.</p>
            <Button onClick={() => navigate('/settings/projects')}>Przejdź do działów</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/operations')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Pojazdy</h1>
              <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/operations/vehicles/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nowy pojazd
        </Button>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4 flex items-center gap-3 text-red-600 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            Nie udało się pobrać listy pojazdów. Spróbuj ponownie.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Flota ({vehicles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : vehicles.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Brak pojazdów. Dodaj pierwszy, aby rozpocząć zarządzanie flotą.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numer rejestracyjny</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Ładowność</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dokumenty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow
                    key={vehicle.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/operations/vehicles/${vehicle.id || ''}`)}
                  >
                    <TableCell className="font-medium">{vehicle.registration_number}</TableCell>
                    <TableCell>
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </TableCell>
                    <TableCell>{vehicle.vehicle_type ?? '—'}</TableCell>
                    <TableCell>{vehicle.capacity ? `${vehicle.capacity} kg` : '—'}</TableCell>
                    <TableCell>
                      {(() => {
                        const badge = statusBadges[vehicle.status] ?? { label: vehicle.status, variant: 'outline' };
                        return <Badge variant={badge.variant}>{badge.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {vehicle.insurance_expiry ? `Ubezp. do ${new Date(vehicle.insurance_expiry).toLocaleDateString()}` : '—'}
                      <br />
                      {vehicle.inspection_expiry ? `Przegląd do ${new Date(vehicle.inspection_expiry).toLocaleDateString()}` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehiclesListPage;
