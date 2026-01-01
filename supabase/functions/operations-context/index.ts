import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OperationsContextRequest {
  department_id: string;
  business_profile_id: string;
}

interface DepartmentTemplate {
  id: string;
  name: string;
  usesVehicles: boolean;
  usesDrivers: boolean;
  jobTerminology: {
    singular: string;
    plural: string;
  };
}

const TEMPLATE_CONFIG: Record<string, DepartmentTemplate> = {
  transport_operations: {
    id: 'transport_operations',
    name: 'Transport zwierząt (operacje)',
    usesVehicles: true,
    usesDrivers: true,
    jobTerminology: { singular: 'Zlecenie', plural: 'Zlecenia' },
  },
  operations: {
    id: 'operations',
    name: 'Operacje',
    usesVehicles: true,
    usesDrivers: true,
    jobTerminology: { singular: 'Zlecenie', plural: 'Zlecenia' },
  },
  funeral_home: {
    id: 'funeral_home',
    name: 'Dom pogrzebowy',
    usesVehicles: false,
    usesDrivers: false,
    jobTerminology: { singular: 'Sprawa', plural: 'Sprawy' },
  },
  construction: {
    id: 'construction',
    name: 'Budownictwo',
    usesVehicles: false,
    usesDrivers: false,
    jobTerminology: { singular: 'Projekt', plural: 'Projekty' },
  },
  saas: {
    id: 'saas',
    name: 'SaaS',
    usesVehicles: false,
    usesDrivers: false,
    jobTerminology: { singular: 'Inicjatywa', plural: 'Inicjatywy' },
  },
  general: {
    id: 'general',
    name: 'Ogólny',
    usesVehicles: false,
    usesDrivers: false,
    jobTerminology: { singular: 'Zadanie', plural: 'Zadania' },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { department_id, business_profile_id } = await req.json() as OperationsContextRequest;

    if (!department_id || !business_profile_id) {
      return new Response(
        JSON.stringify({ error: 'department_id and business_profile_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch department info
    const { data: department, error: deptError } = await supabaseClient
      .from('departments')
      .select('id, name, template, status, charter_decision_id')
      .eq('id', department_id)
      .eq('business_profile_id', business_profile_id)
      .single();

    if (deptError || !department) {
      return new Response(
        JSON.stringify({ error: 'Department not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateConfig = TEMPLATE_CONFIG[department.template] || TEMPLATE_CONFIG.general;

    // Fetch jobs (always needed)
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('operational_jobs')
      .select('*')
      .eq('department_id', department_id)
      .eq('business_profile_id', business_profile_id)
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Jobs fetch error:', jobsError);
    }

    // Conditionally fetch drivers and vehicles
    let drivers = [];
    let vehicles = [];

    if (templateConfig.usesDrivers) {
      const { data: driversData, error: driversError } = await supabaseClient
        .from('drivers')
        .select('*')
        .eq('department_id', department_id)
        .eq('business_profile_id', business_profile_id);

      if (driversError) {
        console.error('Drivers fetch error:', driversError);
      } else {
        drivers = driversData || [];
      }
    }

    if (templateConfig.usesVehicles) {
      const { data: vehiclesData, error: vehiclesError } = await supabaseClient
        .from('vehicles')
        .select('*')
        .eq('department_id', department_id)
        .eq('business_profile_id', business_profile_id);

      if (vehiclesError) {
        console.error('Vehicles fetch error:', vehiclesError);
      } else {
        vehicles = vehiclesData || [];
      }
    }

    // Calculate stats
    const activeJobs = (jobs || []).filter(j => j.status === 'in_progress').length;
    const upcomingJobs = (jobs || []).filter(j => j.status === 'ready' || j.status === 'draft').length;
    const blockedJobs = (jobs || []).filter(j => j.status === 'blocked').length;
    const completedToday = (jobs || []).filter(j => {
      if (j.status !== 'completed' || !j.actual_end) return false;
      const today = new Date();
      const endDate = new Date(j.actual_end);
      return endDate.toDateString() === today.toDateString();
    }).length;

    // Calculate resource availability
    const resourceAvailability = {
      drivers: {
        total: drivers.length,
        available: drivers.filter((d: any) => d.status === 'available').length,
        busy: drivers.filter((d: any) => d.status === 'busy').length,
        blocked: drivers.filter((d: any) => d.status === 'blocked').length,
        expiring_licenses: drivers.filter((d: any) => {
          if (!d.license_expiry) return false;
          const expiry = new Date(d.license_expiry);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiry <= thirtyDaysFromNow;
        }),
      },
      vehicles: {
        total: vehicles.length,
        available: vehicles.filter((v: any) => v.status === 'available').length,
        in_use: vehicles.filter((v: any) => v.status === 'in_use').length,
        out_of_service: vehicles.filter((v: any) => v.status === 'out_of_service').length,
        expiring_insurance: vehicles.filter((v: any) => {
          if (!v.insurance_expiry) return false;
          const expiry = new Date(v.insurance_expiry);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiry <= thirtyDaysFromNow;
        }),
      },
    };

    // Check for critical alerts
    const criticalAlerts = [];
    if (!department.charter_decision_id) {
      criticalAlerts.push({
        type: 'missing_decision',
        severity: 'critical',
        message: 'Brak decyzji autoryzującej dział',
      });
    }

    const response = {
      department: {
        id: department.id,
        name: department.name,
        template: department.template,
        status: department.status,
      },
      template_config: templateConfig,
      jobs: jobs || [],
      drivers: templateConfig.usesDrivers ? drivers : undefined,
      vehicles: templateConfig.usesVehicles ? vehicles : undefined,
      stats: {
        active_jobs: activeJobs,
        upcoming_jobs: upcomingJobs,
        blocked_jobs: blockedJobs,
        completed_today: completedToday,
      },
      resource_availability: resourceAvailability,
      critical_alerts: criticalAlerts,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
