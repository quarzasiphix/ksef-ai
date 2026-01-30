import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoices } from "@/modules/invoices/data/invoiceRepository";
import { getBusinessProfiles } from "@/modules/settings/data/businessProfileRepository";
import { getCustomers } from "@/modules/customers/data/customerRepository";
import { getProducts } from "@/modules/products/data/productRepository";
import { getExpenses } from "@/modules/invoices/data/expenseRepository";
import { useAuth } from "@/shared/hooks/useAuth";
import React, { useEffect, useRef, useMemo } from "react";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { matchConnectedClients, createConnectedClientsMap } from "@/shared/lib/client-connection-matcher";

// Custom hook for prefetching and caching global data
export function useGlobalData(selectedPeriod?: string, fetchAllInvoices?: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { selectedProfileId } = useBusinessProfile();

  // Setup query keys for our global data
  const QUERY_KEYS = {
    invoices: ["invoices"],
    businessProfiles: ["businessProfiles"],
    customers: ["customers"],
    products: ["products"],
    expenses: ["expenses"],
  };

  // Fetch data with React Query
  const invoicesQuery = useQuery({
    queryKey: fetchAllInvoices
      ? [...QUERY_KEYS.invoices, user?.id, selectedProfileId, 'all']
      : selectedPeriod 
        ? [...QUERY_KEYS.invoices, user?.id, selectedProfileId, selectedPeriod]
        : [...QUERY_KEYS.invoices, user?.id, selectedProfileId], 
    queryFn: async () => {
      console.log('useGlobalData - invoicesQuery: Fetching invoices for user', user?.id, 'and profile', selectedProfileId, 'period', selectedPeriod, 'fetchAllInvoices:', fetchAllInvoices);
      if (!user?.id) {
        console.log('useGlobalData - invoicesQuery: No user ID, returning empty array.');
        return [];
      }
      if (!selectedProfileId) {
         console.log('useGlobalData - invoicesQuery: No selected profile ID, returning empty array.');
         return [];
      }
      const data = fetchAllInvoices
        ? await getInvoices(user.id, selectedProfileId)
        : selectedPeriod 
          ? await getInvoices(user.id, selectedProfileId, selectedPeriod)
          : await getInvoices(user.id, selectedProfileId);
      console.log('useGlobalData - invoicesQuery: Fetched invoices:', data);
      
      // Calculate aggregate totals for each invoice
      const invoicesWithTotals = data.map(invoice => {
        const totalNetValue = invoice.items.reduce((sum, item) => sum + (item.totalNetValue || (item.quantity * item.unitPrice) || 0), 0);
        const totalVatValue = invoice.items.reduce((sum, item) => sum + (item.totalVatValue || (item.totalNetValue * (item.vatRate / 100)) || 0), 0);
        const totalGrossValue = totalNetValue + totalVatValue;
        const totalAmount = totalGrossValue; // For now, totalAmount is same as totalGrossValue

        return {
          ...invoice,
          totalNetValue,
          totalVatValue,
          totalGrossValue,
          totalAmount,
        };
      });

      console.log('useGlobalData - invoicesQuery: Processed invoices with totals:', invoicesWithTotals);
      return invoicesWithTotals;
    },
    enabled: !!user?.id && !!selectedProfileId && (selectedPeriod !== undefined || fetchAllInvoices),
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
    // staleTime inherited from global config (10 minutes)
  });

  const businessProfilesQuery = useQuery({
    queryKey: [...QUERY_KEYS.businessProfiles, user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getBusinessProfiles(user.id);
    },
    enabled: !!user?.id,
    placeholderData: (previousData) => previousData,
    // staleTime inherited from global config (10 minutes)
  });

  const customersQuery = useQuery({
    queryKey: [...QUERY_KEYS.customers, 'global'], // Add 'global' to differentiate from profile-specific queries
    queryFn: () => getCustomers(), // Explicitly call without parameters for global view
    placeholderData: (previousData) => previousData,
    // staleTime inherited from global config (10 minutes)
  });

  const productsQuery = useQuery({
    queryKey: [...QUERY_KEYS.products, user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getProducts(user.id);
    },
    enabled: !!user?.id,
    placeholderData: (previousData) => previousData,
    // staleTime inherited from global config (10 minutes)
  });

  const expensesQuery = useQuery({
    queryKey: selectedPeriod 
    ? [...QUERY_KEYS.expenses, user?.id, selectedProfileId, selectedPeriod]
    : [...QUERY_KEYS.expenses, user?.id, selectedProfileId],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return selectedPeriod 
        ? getExpenses(user.id, selectedProfileId || undefined, selectedPeriod)
        : getExpenses(user.id, selectedProfileId || undefined);
    },
    enabled: !!user?.id && !!selectedProfileId,
    placeholderData: (previousData) => previousData,
    // staleTime inherited from global config (10 minutes)
  });

  // Function to manually refresh all data
  const refreshAllData = async () => {
    // Update all refresh timestamps to now
    const now = Date.now();
    Object.keys(lastRefreshTimeRef.current).forEach(key => {
      lastRefreshTimeRef.current[key] = now;
    });
    
    // Invalidate all queries to trigger refetch
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessProfiles }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.expenses }),
    ]);
  };

  // Track last refresh time to prevent excessive refreshes
  const lastRefreshTimeRef = useRef<Record<string, number>>({
    invoices: Date.now(),
    businessProfiles: Date.now(),
    customers: Date.now(),
    products: Date.now(),
    expenses: Date.now(),
  });

  // We're completely disabling automatic refetching on visibility change
  // Data will only be refreshed when explicitly requested or when a mutation occurs

  // Compute connected clients (customers who are also users of the app)
  // This matches customers with business profiles via tax_id (NIP)
  const connectedClients = useMemo(() => {
    const customers = customersQuery.data || [];
    const businessProfiles = businessProfilesQuery.data || [];
    
    if (customers.length === 0 || businessProfiles.length === 0) {
      return [];
    }
    
    return matchConnectedClients(customers, businessProfiles);
  }, [customersQuery.data, businessProfilesQuery.data]);

  // Create fast lookup map for connected clients
  const connectedClientsMap = useMemo(() => {
    return createConnectedClientsMap(connectedClients);
  }, [connectedClients]);

  return {
    invoices: {
      data: invoicesQuery.data || [],
      isLoading: invoicesQuery.isLoading,
      error: invoicesQuery.error,
    },
    businessProfiles: {
      data: businessProfilesQuery.data || [],
      isLoading: businessProfilesQuery.isLoading,
      error: businessProfilesQuery.error,
    },
    customers: {
      data: customersQuery.data || [],
      isLoading: customersQuery.isLoading,
      error: customersQuery.error,
    },
    products: {
      data: productsQuery.data || [],
      isLoading: productsQuery.isLoading,
      error: productsQuery.error,
    },
    expenses: {
      data: expensesQuery.data || [],
      isLoading: expensesQuery.isLoading,
      error: expensesQuery.error,
    },
    // Connected clients - customers who are also users (matched via tax_id)
    connectedClients,
    connectedClientsMap,
    refreshAllData,
    isLoading: 
      invoicesQuery.isLoading || 
      businessProfilesQuery.isLoading || 
      customersQuery.isLoading || 
      productsQuery.isLoading || 
      expensesQuery.isLoading,
  };
}
