import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LedgerEvent {
  id: string
  event_type: string
  occurred_at: string
  recorded_at: string
  amount: number
  currency: string
  direction: 'incoming' | 'outgoing' | 'neutral'
  document_type: string
  document_id: string
  document_number: string
  counterparty: string | null
  status: string
  posted: boolean
  source_table: string
  metadata: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader ?? '' },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body for filters
    const { business_profile_id, start_date, end_date, event_types, document_types } = await req.json()

    if (!business_profile_id) {
      return new Response(
        JSON.stringify({ error: 'business_profile_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const ledgerEvents: LedgerEvent[] = []

    // 1. Aggregate INVOICES (issued by us)
    const { data: invoices, error: invoicesError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        customers (
          name
        )
      `)
      .eq('business_profile_id', business_profile_id)
      .order('issue_date', { ascending: false })

    if (!invoicesError && invoices) {
      for (const invoice of invoices) {
        const totalGross = Number(invoice.total_gross_value ?? invoice.total_gross ?? 0)
        const totalNet = Number(invoice.total_net_value ?? invoice.total_net ?? 0)
        const totalVat = Number(invoice.total_vat_value ?? invoice.total_vat ?? 0)
        const invoiceCurrency = invoice.currency || 'PLN'
        const exchangeRate = Number(invoice.exchange_rate ?? 1) || 1
        const plnAmount = invoiceCurrency === 'PLN' ? totalGross : totalGross * exchangeRate

        // Get customer name from joined data or fallback
        const customerName = invoice.customers?.name || invoice.customer_name || null
        const isPaid = invoice.payment_status === 'paid' || invoice.is_paid === true

        ledgerEvents.push({
          id: `invoice-${invoice.id}`,
          event_type: 'invoice_issued',
          occurred_at: invoice.issue_date,
          recorded_at: invoice.created_at,
          amount: totalGross,
          currency: invoiceCurrency,
          direction: 'incoming',
          document_type: 'invoice',
          document_id: invoice.id,
          document_number: invoice.number || invoice.invoice_number || `INV-${invoice.id.substring(0, 8)}`,
          counterparty: customerName,
          status: isPaid ? 'paid' : 'unpaid',
          posted: true,
          source_table: 'invoices',
          metadata: {
            due_date: invoice.due_date,
            payment_date: invoice.payment_date,
            net_amount: totalNet,
            vat_amount: totalVat,
            exchange_rate: exchangeRate,
            pln_amount: plnAmount,
          }
        })

        // Add payment event if paid
        if (isPaid && invoice.payment_date) {
          ledgerEvents.push({
            id: `invoice-payment-${invoice.id}`,
            event_type: 'payment_received',
            occurred_at: invoice.payment_date,
            recorded_at: invoice.payment_date,
            amount: totalGross,
            currency: invoiceCurrency,
            direction: 'incoming',
            document_type: 'payment',
            document_id: invoice.id,
            document_number: `PAY-${invoice.number || invoice.invoice_number || invoice.id.substring(0, 8)}`,
            counterparty: customerName,
            status: 'settled',
            posted: true,
            source_table: 'invoices',
            metadata: {
              invoice_id: invoice.id,
              invoice_number: invoice.number || invoice.invoice_number,
              exchange_rate: exchangeRate,
              pln_amount: plnAmount,
            }
          })
        }
      }
    }

    // 2. Aggregate EXPENSES
    const { data: expenses, error: expensesError } = await supabaseClient
      .from('expenses')
      .select('*')
      .eq('business_profile_id', business_profile_id)
      .order('expense_date', { ascending: false })

    if (!expensesError && expenses) {
      for (const expense of expenses) {
        ledgerEvents.push({
          id: `expense-${expense.id}`,
          event_type: 'expense_posted',
          occurred_at: expense.expense_date,
          recorded_at: expense.created_at,
          amount: expense.amount,
          currency: expense.currency || 'PLN',
          direction: 'outgoing',
          document_type: 'expense',
          document_id: expense.id,
          document_number: expense.expense_number || `EXP-${expense.id.substring(0, 8)}`,
          counterparty: expense.vendor_name || null,
          status: expense.status || 'posted',
          posted: true,
          source_table: 'expenses',
          metadata: {
            category: expense.category,
            vat_rate: expense.vat_rate,
            description: expense.description,
          }
        })
      }
    }

    // 3. Aggregate CONTRACTS (as neutral anchors)
    const { data: contracts, error: contractsError } = await supabaseClient
      .from('contracts')
      .select('*')
      .eq('business_profile_id', business_profile_id)
      .order('start_date', { ascending: false })

    if (!contractsError && contracts) {
      for (const contract of contracts) {
        ledgerEvents.push({
          id: `contract-${contract.id}`,
          event_type: 'contract_signed',
          occurred_at: contract.start_date,
          recorded_at: contract.created_at,
          amount: contract.total_value || 0,
          currency: contract.currency || 'PLN',
          direction: 'neutral',
          document_type: 'contract',
          document_id: contract.id,
          document_number: contract.contract_number || `CTR-${contract.id.substring(0, 8)}`,
          counterparty: contract.counterparty_name || null,
          status: contract.status || 'active',
          posted: true,
          source_table: 'contracts',
          metadata: {
            start_date: contract.start_date,
            end_date: contract.end_date,
            contract_type: contract.contract_type,
          }
        })
      }
    }

    // 4. Aggregate BANK TRANSACTIONS
    const { data: bankTransactions, error: bankError } = await supabaseClient
      .from('bank_transactions')
      .select('*')
      .eq('business_profile_id', business_profile_id)
      .order('transaction_date', { ascending: false })

    if (!bankError && bankTransactions) {
      for (const transaction of bankTransactions) {
        const isIncoming = transaction.amount > 0
        ledgerEvents.push({
          id: `bank-${transaction.id}`,
          event_type: isIncoming ? 'payment_received' : 'payment_sent',
          occurred_at: transaction.transaction_date,
          recorded_at: transaction.created_at,
          amount: Math.abs(transaction.amount),
          currency: transaction.currency || 'PLN',
          direction: isIncoming ? 'incoming' : 'outgoing',
          document_type: 'bank_transaction',
          document_id: transaction.id,
          document_number: transaction.reference_number || `BNK-${transaction.id.substring(0, 8)}`,
          counterparty: transaction.counterparty_name || null,
          status: transaction.status || 'completed',
          posted: true,
          source_table: 'bank_transactions',
          metadata: {
            bank_account_id: transaction.bank_account_id,
            description: transaction.description,
            balance_after: transaction.balance_after,
          }
        })
      }
    }

    // 5. Aggregate ACCOUNT MOVEMENTS (treasury)
    const { data: movements, error: movementsError } = await supabaseClient
      .from('account_movements')
      .select('*')
      .eq('business_profile_id', business_profile_id)
      .order('created_at', { ascending: false })

    if (!movementsError && movements) {
      for (const movement of movements) {
        const isIncoming = movement.direction === 'in'
        ledgerEvents.push({
          id: `movement-${movement.id}`,
          event_type: isIncoming ? 'payment_received' : 'payment_sent',
          occurred_at: movement.created_at,
          recorded_at: movement.created_at,
          amount: movement.amount,
          currency: movement.currency || 'PLN',
          direction: isIncoming ? 'incoming' : 'outgoing',
          document_type: 'payment',
          document_id: movement.id,
          document_number: `MOV-${movement.id.substring(0, 8)}`,
          counterparty: null,
          status: 'completed',
          posted: true,
          source_table: 'account_movements',
          metadata: {
            payment_account_id: movement.payment_account_id,
            source_type: movement.source_type,
            source_id: movement.source_id,
            description: movement.description,
          }
        })
      }
    }

    // Apply filters
    let filteredEvents = ledgerEvents

    if (start_date) {
      filteredEvents = filteredEvents.filter(e => e.occurred_at >= start_date)
    }

    if (end_date) {
      filteredEvents = filteredEvents.filter(e => e.occurred_at <= end_date)
    }

    if (event_types && event_types.length > 0) {
      filteredEvents = filteredEvents.filter(e => event_types.includes(e.event_type))
    }

    if (document_types && document_types.length > 0) {
      filteredEvents = filteredEvents.filter(e => document_types.includes(e.document_type))
    }

    // Sort by occurred_at DESC (most recent first)
    filteredEvents.sort((a, b) => {
      return new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    })

    const toPlnAmount = (event: LedgerEvent) => {
      if (event.currency === 'PLN') {
        return Number(event.amount) || 0
      }

      const metadataAmount = Number(event.metadata?.pln_amount)
      if (!Number.isNaN(metadataAmount) && metadataAmount) {
        return metadataAmount
      }

      const exchangeRate = Number(event.metadata?.exchange_rate)
      if (!Number.isNaN(exchangeRate) && exchangeRate > 0) {
        return (Number(event.amount) || 0) * exchangeRate
      }

      return Number(event.amount) || 0
    }

    // Calculate summary with currency grouping
    const totalsByCurrency = filteredEvents.reduce((acc, event) => {
      const currency = event.currency || 'PLN'
      if (!acc[currency]) {
        acc[currency] = { incoming: 0, outgoing: 0 }
      }

      const amount = Number(event.amount) || 0
      if (event.direction === 'incoming') {
        acc[currency].incoming += amount
      } else if (event.direction === 'outgoing') {
        acc[currency].outgoing += amount
      }

      return acc
    }, {} as Record<string, { incoming: number; outgoing: number }>)

    const plnTotals = filteredEvents.reduce(
      (acc, event) => {
        const amount = toPlnAmount(event)
        if (event.direction === 'incoming') {
          acc.incoming += amount
        } else if (event.direction === 'outgoing') {
          acc.outgoing += amount
        }
        return acc
      },
      { incoming: 0, outgoing: 0 }
    )

    const currencyTotals = Object.entries(totalsByCurrency).reduce((acc, [currency, totals]) => {
      acc[currency] = {
        incoming: totals.incoming,
        outgoing: totals.outgoing,
        net: totals.incoming - totals.outgoing,
      }
      return acc
    }, {} as Record<string, { incoming: number; outgoing: number; net: number }>)

    const defaultCurrency = 'PLN'

    const summary = {
      total_incoming: plnTotals.incoming,
      total_outgoing: plnTotals.outgoing,
      event_count: filteredEvents.length,
      by_type: filteredEvents.reduce((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      by_source: filteredEvents.reduce((acc, e) => {
        acc[e.source_table] = (acc[e.source_table] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      currency_totals: currencyTotals,
    }

    return new Response(
      JSON.stringify({
        events: filteredEvents,
        summary,
        metadata: {
          business_profile_id,
          generated_at: new Date().toISOString(),
          filters_applied: {
            start_date,
            end_date,
            event_types,
            document_types,
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
