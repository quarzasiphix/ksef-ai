
import React, { useEffect } from "react";
import { useGlobalData } from "@/hooks/use-global-data";
import { toast } from "sonner";

const GlobalDataLoader: React.FC = () => {
  const { isLoading, refreshAllData } = useGlobalData();
  
  useEffect(() => {
    // When app starts, initialize data loading
    // Note: this is handled implicitly by the useGlobalData hook
    
    // Set up periodic refresh (optional) - every 10 minutes
    const refreshInterval = setInterval(() => {
      refreshAllData();
    }, 1000 * 60 * 10); // 10 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshAllData]);

  // We don't need to render anything here - this is just a "side effect" component
  return null;
};

export default GlobalDataLoader;
