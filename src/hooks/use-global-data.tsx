import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { getExpenses } from "@/integrations/supabase/repositories/expenseRepository";
import { useAuth } from "@/App";
import React, { useEffect, useRef } from "react";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

// Custom hook for prefetching and caching global data
export function useGlobalData() {
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
    queryKey: [...QUERY_KEYS.invoices, user?.id, selectedProfileId],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getInvoices(user.id, selectedProfileId || undefined);
    },
    enabled: !!user?.id && !!selectedProfileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const businessProfilesQuery = useQuery({
    queryKey: QUERY_KEYS.businessProfiles,
    queryFn: getBusinessProfiles,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const customersQuery = useQuery({
    queryKey: QUERY_KEYS.customers,
    queryFn: getCustomers,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const productsQuery = useQuery({
    queryKey: [...QUERY_KEYS.products, user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getProducts(user.id);
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const expensesQuery = useQuery({
    queryKey: [...QUERY_KEYS.expenses, user?.id, selectedProfileId],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return getExpenses(user.id, selectedProfileId || undefined);
    },
    enabled: !!user?.id && !!selectedProfileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    refreshAllData,
    isLoading: 
      invoicesQuery.isLoading || 
      businessProfilesQuery.isLoading || 
      customersQuery.isLoading || 
      productsQuery.isLoading || 
      expensesQuery.isLoading,
  };
}
