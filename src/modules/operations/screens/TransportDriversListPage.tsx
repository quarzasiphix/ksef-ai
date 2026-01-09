import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Plus, ArrowLeft, UsersRound, AlertTriangle } from 'lucide-react';
import { getDrivers } from '../data/operationsRepository';
import type { Driver } from '../types';

const statusBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Dostępny', variant: 'default' },
  busy: { label: 'W trasie', variant: 'secondary' },
  off_duty: { label: 'Poza dyżurem', variant: 'outline' },
  blocked: { label: 'Zablokowany', variant: 'destructive' },
};

const DriversListPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();

  const { data: drivers = [], isLoading, isError } = useQuery<Driver[]>({
    queryKey: ['drivers', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getDrivers(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && !!selectedProfileId,
  });

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <UsersRound className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-60" />
            <h3 className="text-lg font-semibold mb-2">Wybierz dział, aby zarządzać kierowcami</h3>
            <p className="text-muted-foreground mb-4">Kierowcy są przypisani do konkretnego działu operacyjnego.</p>
            <Button onClick={() => navigate('/settings/projects')}>Przejdź do działów</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/operations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Kierowcy</h1>
            <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
          </div>
        </div>
        <Button onClick={() => navigate('/operations/drivers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nowy kierowca
        </Button>
      </div>

      {isError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardContent className="py-4 flex items-center gap-3 text-red-600 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            Nie udało się pobrać listy kierowców. Spróbuj ponownie.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Zespół kierowców ({drivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : drivers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Brak kierowców. Dodaj pierwszego, aby rozpocząć planowanie tras.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imię i nazwisko</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Uprawnienia</TableHead>
                  <TableHead>Certyfikaty</TableHead>
                  <TableHead>Dokumenty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/operations/drivers/${driver.id || ''}`)}
                  >
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>
                      {(() => {
                        const badge = statusBadges[driver.status] ?? { label: driver.status, variant: 'outline' };
                        return <Badge variant={badge.variant}>{badge.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell>{driver.phone ?? '—'}</TableCell>
                    <TableCell>{driver.license_type ?? '—'}</TableCell>
                    <TableCell>
                      {driver.certifications && driver.certifications.length > 0
                        ? driver.certifications.join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {driver.license_expiry ? `Prawo jazdy do ${new Date(driver.license_expiry).toLocaleDateString()}` : '—'}
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

export default DriversListPage;
