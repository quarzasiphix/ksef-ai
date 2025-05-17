
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getInvoices } from "@/integrations/supabase/repositories/invoiceRepository";
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";
import { getCustomers } from "@/integrations/supabase/repositories/customerRepository";
import { getProducts } from "@/integrations/supabase/repositories/productRepository";
import { useEffect } from "react";

// Custom hook for prefetching and caching global data
export function useGlobalData() {
  const queryClient = useQueryClient();

  // Setup query keys for our global data
  const QUERY_KEYS = {
    invoices: ["invoices"],
    businessProfiles: ["businessProfiles"],
    customers: ["customers"],
    products: ["products"],
  };

  // Fetch data with React Query
  const invoicesQuery = useQuery({
    queryKey: QUERY_KEYS.invoices,
    queryFn: getInvoices,
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
    queryKey: QUERY_KEYS.products,
    queryFn: getProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Function to manually refresh all data
  const refreshAllData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessProfiles });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.customers });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
  };

  // Set up refetch on window focus (when user returns to the app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshAllData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
    refreshAllData,
    isLoading: 
      invoicesQuery.isLoading || 
      businessProfilesQuery.isLoading || 
      customersQuery.isLoading || 
      productsQuery.isLoading,
  };
}
