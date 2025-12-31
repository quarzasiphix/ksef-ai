import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncCheckRequest {
  businessProfileId: string;
  lastSyncTimestamps?: {
    invoices?: string;
    contracts?: string;
    decisions?: string;
    ledger?: string;
    discussions?: string;
    employees?: string;
    bankAccounts?: string;
    operationsJobs?: string;
    operationsDrivers?: string;
    operationsVehicles?: string;
  };
}

interface SyncCheckResponse {
  hasUpdates: {
    invoices: boolean;
    contracts: boolean;
    decisions: boolean;
    ledger: boolean;
    discussions: boolean;
    employees: boolean;
    bankAccounts: boolean;
    operationsJobs: boolean;
    operationsDrivers: boolean;
    operationsVehicles: boolean;
  };
  latestTimestamps: {
    invoices: string | null;
    contracts: string | null;
    decisions: string | null;
    ledger: string | null;
    discussions: string | null;
    employees: string | null;
    bankAccounts: string | null;
    operationsJobs: string | null;
    operationsDrivers: string | null;
    operationsVehicles: string | null;
  };
  counts: {
    invoices: number;
    contracts: number;
    decisions: number;
    ledger: number;
    discussions: number;
    employees: number;
    bankAccounts: number;
    operationsJobs: number;
    operationsDrivers: number;
    operationsVehicles: number;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SyncCheckRequest = await req.json();
    const { businessProfileId, lastSyncTimestamps = {} } = body;

    if (!businessProfileId) {
      return new Response(
        JSON.stringify({ error: 'businessProfileId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this business profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('id')
      .eq('id', businessProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Business profile not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check each entity type for updates using MAX(updated_at)
    const checks = await Promise.all([
      // Invoices
      supabaseClient
        .from('invoices')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Contracts
      supabaseClient
        .from('contracts')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Decisions
      supabaseClient
        .from('decisions')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Ledger events
      supabaseClient
        .from('ledger_events')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Discussion threads
      supabaseClient
        .from('discussion_threads')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Employees
      supabaseClient
        .from('employees')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
      
      // Bank accounts
      supabaseClient
        .from('bank_accounts')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Operational jobs
      supabaseClient
        .from('operational_jobs')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Drivers
      supabaseClient
        .from('drivers')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),

      // Vehicles
      supabaseClient
        .from('vehicles')
        .select('updated_at', { count: 'exact', head: false })
        .eq('business_profile_id', businessProfileId)
        .order('updated_at', { ascending: false })
        .limit(1),
    ]);

    const [
      invoicesResult,
      contractsResult,
      decisionsResult,
      ledgerResult,
      discussionsResult,
      employeesResult,
      bankAccountsResult,
      operationsJobsResult,
      driversResult,
      vehiclesResult,
    ] = checks;

    // Build response
    const response: SyncCheckResponse = {
      hasUpdates: {
        invoices: false,
        contracts: false,
        decisions: false,
        ledger: false,
        discussions: false,
        employees: false,
        bankAccounts: false,
        operationsJobs: false,
        operationsDrivers: false,
        operationsVehicles: false,
      },
      latestTimestamps: {
        invoices: invoicesResult.data?.[0]?.updated_at || null,
        contracts: contractsResult.data?.[0]?.updated_at || null,
        decisions: decisionsResult.data?.[0]?.updated_at || null,
        ledger: ledgerResult.data?.[0]?.updated_at || null,
        discussions: discussionsResult.data?.[0]?.updated_at || null,
        employees: employeesResult.data?.[0]?.updated_at || null,
        bankAccounts: bankAccountsResult.data?.[0]?.updated_at || null,
        operationsJobs: operationsJobsResult.data?.[0]?.updated_at || null,
        operationsDrivers: driversResult.data?.[0]?.updated_at || null,
        operationsVehicles: vehiclesResult.data?.[0]?.updated_at || null,
      },
      counts: {
        invoices: invoicesResult.count || 0,
        contracts: contractsResult.count || 0,
        decisions: decisionsResult.count || 0,
        ledger: ledgerResult.count || 0,
        discussions: discussionsResult.count || 0,
        employees: employeesResult.count || 0,
        bankAccounts: bankAccountsResult.count || 0,
        operationsJobs: operationsJobsResult.count || 0,
        operationsDrivers: driversResult.count || 0,
        operationsVehicles: vehiclesResult.count || 0,
      },
    };

    // Compare timestamps to determine if updates exist
    if (lastSyncTimestamps.invoices && response.latestTimestamps.invoices) {
      response.hasUpdates.invoices = new Date(response.latestTimestamps.invoices) > new Date(lastSyncTimestamps.invoices);
    } else if (response.latestTimestamps.invoices) {
      response.hasUpdates.invoices = true;
    }

    if (lastSyncTimestamps.contracts && response.latestTimestamps.contracts) {
      response.hasUpdates.contracts = new Date(response.latestTimestamps.contracts) > new Date(lastSyncTimestamps.contracts);
    } else if (response.latestTimestamps.contracts) {
      response.hasUpdates.contracts = true;
    }

    if (lastSyncTimestamps.decisions && response.latestTimestamps.decisions) {
      response.hasUpdates.decisions = new Date(response.latestTimestamps.decisions) > new Date(lastSyncTimestamps.decisions);
    } else if (response.latestTimestamps.decisions) {
      response.hasUpdates.decisions = true;
    }

    if (lastSyncTimestamps.ledger && response.latestTimestamps.ledger) {
      response.hasUpdates.ledger = new Date(response.latestTimestamps.ledger) > new Date(lastSyncTimestamps.ledger);
    } else if (response.latestTimestamps.ledger) {
      response.hasUpdates.ledger = true;
    }

    if (lastSyncTimestamps.discussions && response.latestTimestamps.discussions) {
      response.hasUpdates.discussions = new Date(response.latestTimestamps.discussions) > new Date(lastSyncTimestamps.discussions);
    } else if (response.latestTimestamps.discussions) {
      response.hasUpdates.discussions = true;
    }

    if (lastSyncTimestamps.employees && response.latestTimestamps.employees) {
      response.hasUpdates.employees = new Date(response.latestTimestamps.employees) > new Date(lastSyncTimestamps.employees);
    } else if (response.latestTimestamps.employees) {
      response.hasUpdates.employees = true;
    }

    if (lastSyncTimestamps.bankAccounts && response.latestTimestamps.bankAccounts) {
      response.hasUpdates.bankAccounts = new Date(response.latestTimestamps.bankAccounts) > new Date(lastSyncTimestamps.bankAccounts);
    } else if (response.latestTimestamps.bankAccounts) {
      response.hasUpdates.bankAccounts = true;
    }

    if (lastSyncTimestamps.operationsJobs && response.latestTimestamps.operationsJobs) {
      response.hasUpdates.operationsJobs = new Date(response.latestTimestamps.operationsJobs) > new Date(lastSyncTimestamps.operationsJobs);
    } else if (response.latestTimestamps.operationsJobs) {
      response.hasUpdates.operationsJobs = true;
    }

    if (lastSyncTimestamps.operationsDrivers && response.latestTimestamps.operationsDrivers) {
      response.hasUpdates.operationsDrivers = new Date(response.latestTimestamps.operationsDrivers) > new Date(lastSyncTimestamps.operationsDrivers);
    } else if (response.latestTimestamps.operationsDrivers) {
      response.hasUpdates.operationsDrivers = true;
    }

    if (lastSyncTimestamps.operationsVehicles && response.latestTimestamps.operationsVehicles) {
      response.hasUpdates.operationsVehicles = new Date(response.latestTimestamps.operationsVehicles) > new Date(lastSyncTimestamps.operationsVehicles);
    } else if (response.latestTimestamps.operationsVehicles) {
      response.hasUpdates.operationsVehicles = true;
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        } 
      }
    );

  } catch (error) {
    console.error('Sync check error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
