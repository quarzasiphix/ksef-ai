import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  Truck, Users, Briefcase, AlertCircle, CheckCircle2, 
  Clock, XCircle, Plus, TrendingUp, Shield, FileText
} from 'lucide-react';
import { getOperationsDashboard, getJobs, getDrivers, getVehicles } from '../data/operationsRepository';
import type { OperationalJob, Driver, Vehicle } from '../types';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getJobTerminology } from '../types';

/**
 * Operations Page - Run the business today
 * 
 * Shows:
 * - Active jobs (in progress)
 * - Upcoming jobs (ready/draft)
 * - Resources (drivers, vehicles)
 * - Critical alerts (blocking issues)
 */
const OperationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProject: selectedDepartment } = useProjectScope();

  const departmentTemplate = selectedDepartment ? getDepartmentTemplate(selectedDepartment.template) : null;
  const jobTerminology = departmentTemplate ? getJobTerminology(departmentTemplate.id) : { singular: 'Zadanie', plural: 'Zadania' };
  
  // Determine if this template uses vehicles/drivers
  const usesVehicles = departmentTemplate?.id === 'transport_operations' || departmentTemplate?.id === 'operations';
  const usesDrivers = departmentTemplate?.id === 'transport_operations' || departmentTemplate?.id === 'operations';

  // Fetch dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['operations-dashboard', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return null;
      return getOperationsDashboard(selectedDepartment.id);
    },
    enabled: !!selectedDepartment,
  });

  // Fetch active and upcoming jobs
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['jobs', selectedDepartment?.id, 'in_progress'],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getJobs(selectedDepartment.id, 'in_progress');
    },
    enabled: !!selectedDepartment,
  });

  const { data: upcomingJobs = [] } = useQuery({
    queryKey: ['jobs', selectedDepartment?.id, 'upcoming'],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      const ready = await getJobs(selectedDepartment.id, 'ready');
      const draft = await getJobs(selectedDepartment.id, 'draft');
      return [...ready, ...draft];
    },
    enabled: !!selectedDepartment,
  });

  // Fetch resources (only for templates that use them)
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getDrivers(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && usesDrivers,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', selectedDepartment?.id],
    queryFn: async () => {
      if (!selectedDepartment) return [];
      return getVehicles(selectedDepartment.id);
    },
    enabled: !!selectedDepartment && usesVehicles,
  });

  if (!selectedDepartment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Wybierz dział operacyjny</h3>
            <p className="text-muted-foreground mb-4">
              Operacje są dostępne dla działów z szablonem operacyjnym (np. Transport, Logistyka)
            </p>
            <Button onClick={() => navigate('/settings/projects')}>
              Przejdź do działów
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge className="bg-blue-500">W trakcie</Badge>;
      case 'ready':
        return <Badge className="bg-green-500">Gotowe</Badge>;
      case 'draft':
        return <Badge variant="secondary">Projekt</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500">Zablokowane</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500">Zakończone</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Operacje</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedDepartment.name} - zarządzanie realizacją
          </p>
        </div>
        <Button onClick={() => navigate('/operations/jobs/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {jobTerminology.singular}
        </Button>
      </div>

      {/* Department Context */}
      {departmentTemplate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="h-3 w-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: selectedDepartment.color || '#3b82f6' }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{selectedDepartment.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {departmentTemplate.name}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Operacje wykonawcze - zlecenia, zasoby, realizacja
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts */}
      {dashboard && dashboard.critical_alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900 dark:text-red-100">
              <AlertCircle className="h-5 w-5" />
              Alerty krytyczne ({dashboard.critical_alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dashboard.critical_alerts.slice(0, 5).map((alert, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-red-900/20 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      {alert.message}
                    </p>
                    {alert.resolution_action && (
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        → {alert.resolution_action}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aktywne zlecenia</p>
                  <p className="text-2xl font-bold">{dashboard.active_jobs}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nadchodzące</p>
                  <p className="text-2xl font-bold">{dashboard.upcoming_jobs}</p>
                </div>
                <Briefcase className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Zablokowane</p>
                  <p className="text-2xl font-bold">{dashboard.blocked_jobs}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dziś ukończone</p>
                  <p className="text-2xl font-bold">{dashboard.completed_today}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            {jobTerminology.plural} w trakcie ({activeJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeJobs.length > 0 ? (
            <div className="space-y-3">
              {activeJobs.map(job => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/operations/jobs/${job.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{job.title}</h3>
                        {getJobStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{job.job_number}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Kierowca:</span>
                      <p className="font-medium">{job.assigned_driver_id ? 'Przypisany' : 'Brak'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pojazd:</span>
                      <p className="font-medium">{job.assigned_vehicle_id ? 'Przypisany' : 'Brak'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start:</span>
                      <p className="font-medium">
                        {job.scheduled_start ? new Date(job.scheduled_start).toLocaleString('pl-PL') : '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Koniec:</span>
                      <p className="font-medium">
                        {job.scheduled_end ? new Date(job.scheduled_end).toLocaleString('pl-PL') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Brak aktywnych {jobTerminology.plural.toLowerCase()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-green-500" />
            Nadchodzące {jobTerminology.plural.toLowerCase()} ({upcomingJobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingJobs.length > 0 ? (
            <div className="space-y-3">
              {upcomingJobs.map(job => (
                <div
                  key={job.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/operations/jobs/${job.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{job.title}</h3>
                        {getJobStatusBadge(job.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{job.job_number}</p>
                    </div>
                  </div>
                  {job.blocking_issues && job.blocking_issues.length > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ {job.blocking_issues.length} problemów do rozwiązania
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Brak nadchodzących {jobTerminology.plural.toLowerCase()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resources - only show for templates that use them */}
      {(usesDrivers || usesVehicles) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Drivers */}
          {usesDrivers && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kierowcy ({drivers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {dashboard.resource_availability.drivers.available}
                  </p>
                  <p className="text-xs text-muted-foreground">Dostępni</p>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {dashboard.resource_availability.drivers.busy}
                  </p>
                  <p className="text-xs text-muted-foreground">Zajęci</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {dashboard.resource_availability.drivers.blocked}
                  </p>
                  <p className="text-xs text-muted-foreground">Zablokowani</p>
                </div>
              </div>
            )}
            {dashboard && dashboard.resource_availability.drivers.expiring_licenses.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded mb-3">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  ⚠️ Wygasające uprawnienia
                </p>
                {dashboard.resource_availability.drivers.expiring_licenses.map(driver => (
                  <p key={driver.id} className="text-xs text-yellow-800 dark:text-yellow-200">
                    {driver.name} - {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString('pl-PL') : 'brak daty'}
                  </p>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate('/operations/drivers')}>
              Zarządzaj kierowcami
            </Button>
          </CardContent>
        </Card>
          )}

          {/* Vehicles */}
          {usesVehicles && (
            <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Pojazdy ({vehicles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {dashboard.resource_availability.vehicles.available}
                  </p>
                  <p className="text-xs text-muted-foreground">Dostępne</p>
                </div>
                <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {dashboard.resource_availability.vehicles.in_use}
                  </p>
                  <p className="text-xs text-muted-foreground">W użyciu</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {dashboard.resource_availability.vehicles.out_of_service}
                  </p>
                  <p className="text-xs text-muted-foreground">Serwis</p>
                </div>
              </div>
            )}
            {dashboard && dashboard.resource_availability.vehicles.expiring_insurance.length > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded mb-3">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                  ⚠️ Wygasające ubezpieczenia
                </p>
                {dashboard.resource_availability.vehicles.expiring_insurance.map(vehicle => (
                  <p key={vehicle.id} className="text-xs text-yellow-800 dark:text-yellow-200">
                    {vehicle.registration_number} - {vehicle.insurance_expiry ? new Date(vehicle.insurance_expiry).toLocaleDateString('pl-PL') : 'brak daty'}
                  </p>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate('/operations/vehicles')}>
              Zarządzaj pojazdami
            </Button>
          </CardContent>
        </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default OperationsPage;
