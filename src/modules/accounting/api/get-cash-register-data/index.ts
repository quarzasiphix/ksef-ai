import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CashRegisterRequest {
  businessProfileId: string;
  cashAccountId?: string;
  startDate?: string;
  endDate?: string;
}

Deno.serve(async (req) => {
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
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { businessProfileId, cashAccountId, startDate, endDate }: CashRegisterRequest = await req.json();

    console.log('[get-cash-register-data] Request params:', { businessProfileId, cashAccountId, startDate, endDate });

    if (!businessProfileId) {
      return new Response(
        JSON.stringify({ error: 'businessProfileId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch all data in parallel
    const [
      cashAccountsResult,
      cashSettingsResult,
      bankAccountsResult,
      cashTransactionsResult,
      cashSummaryResult,
      cashReconciliationsResult,
      accountBalancesResult,
    ] = await Promise.all([
      // 1. Get cash accounts (payment_accounts with type CASH)
      supabaseClient
        .from('payment_accounts')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('account_type', 'CASH')
        .order('created_at', { ascending: true }),

      // 2. Get cash settings
      supabaseClient
        .from('cash_settings')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .maybeSingle(),

      // 3. Get bank accounts
      supabaseClient
        .from('bank_accounts')
        .select('*')
        .eq('business_profile_id', businessProfileId),

      // 4. Get cash transactions (kasa_documents) - only if cashAccountId provided
      cashAccountId
        ? supabaseClient
            .from('kasa_documents')
            .select('*')
            .eq('business_profile_id', businessProfileId)
            .eq('cash_account_id', cashAccountId)
            .gte('payment_date', startDate || '1900-01-01')
            .lte('payment_date', endDate || '2100-12-31')
            .eq('is_cancelled', false)
            .order('payment_date', { ascending: false })
            .then((result: any) => {
              console.log('[get-cash-register-data] Transactions query result:', { 
                cashAccountId, 
                count: result.data?.length || 0,
                error: result.error 
              });
              return result;
            })
        : Promise.resolve({ data: [], error: null }),

      // 5. Cash summary placeholder (computed below)
      Promise.resolve({ data: null, error: null }),

      // 6. Get cash reconciliations - only if cashAccountId provided
      cashAccountId
        ? supabaseClient
            .from('cash_reconciliations')
            .select('*')
            .eq('business_profile_id', businessProfileId)
            .eq('cash_account_id', cashAccountId)
            .order('reconciliation_date', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),

      // 7. Get account balances for all cash accounts (view)
      supabaseClient
        .from('payment_account_balances')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('account_type', 'CASH'),
    ]);

    // Check for errors
    const errors = [
      cashAccountsResult.error,
      cashSettingsResult.error,
      bankAccountsResult.error,
      cashTransactionsResult.error,
      cashSummaryResult.error,
      cashReconciliationsResult.error,
      accountBalancesResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error('Errors fetching cash register data:', errors);
      return new Response(
        JSON.stringify({ error: 'Error fetching data', details: errors }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Map cash accounts with their balances
    const cashAccounts = (cashAccountsResult.data || []).map((account: any) => {
      const balance = (accountBalancesResult.data || []).find(
        (b: any) => b.payment_account_id === account.id
      );
      return {
        ...account,
        current_balance: balance?.current_balance ?? account.opening_balance,
        status: account.is_active ? 'active' : 'closed',
      };
    });

    let cashSummary = null;
    if (cashAccountId) {
      interface CashTransactionSummary {
        type: 'KP' | 'KW' | string;
        amount: number;
        is_approved: boolean;
      }

      const txs = (cashTransactionsResult.data || []) as CashTransactionSummary[];
      const totalKP = txs
        .filter(tx => tx.type === 'KP')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      const totalKW = txs
        .filter(tx => tx.type === 'KW')
        .reduce((sum, tx) => sum + Number(tx.amount), 0);
      const pendingApproval = txs.filter(tx => !tx.is_approved).length;
      const currentBalance = (accountBalancesResult.data || []).find(
        (b: any) => b.payment_account_id === cashAccountId
      )?.current_balance ?? 0;

      cashSummary = {
        totalKP,
        totalKW,
        netChange: totalKP - totalKW,
        transactionCount: txs.length,
        pendingApproval,
        currentBalance,
        lastReconciliation: (cashReconciliationsResult.data || [])[0] || null,
      };
    }

    // Return consolidated data
    const response = {
      cashAccounts,
      cashSettings: cashSettingsResult.data,
      bankAccounts: bankAccountsResult.data || [],
      cashTransactions: cashTransactionsResult.data || [],
      cashSummary,
      cashReconciliations: cashReconciliationsResult.data || [],
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-cash-register-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
