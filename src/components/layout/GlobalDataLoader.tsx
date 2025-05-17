
import React, { useEffect, useState } from "react";
import { useGlobalData } from "@/hooks/use-global-data";
import { toast } from "sonner";
import { Loader } from "lucide-react";

const GlobalDataLoader: React.FC = () => {
  const { isLoading, refreshAllData } = useGlobalData();
  const [initialLoad, setInitialLoad] = useState(true);
  
  useEffect(() => {
    const initializeData = async () => {
      try {
        // When app starts, initialize data loading
        await refreshAllData();
        setInitialLoad(false);
      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Wystąpił błąd podczas ładowania danych");
        setInitialLoad(false);
      }
    };
    
    if (initialLoad) {
      initializeData();
    }
    
    // Set up periodic refresh (optional) - every 10 minutes
    const refreshInterval = setInterval(() => {
      refreshAllData();
    }, 1000 * 60 * 10); // 10 minutes
    
    return () => {
      clearInterval(refreshInterval);
    };
  }, [refreshAllData, initialLoad]);

  if (initialLoad && isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 px-4 text-center">
          <Loader className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Ładowanie danych aplikacji...</p>
        </div>
      </div>
    );
  }

  // Once loaded, don't render anything
  return null;
};

export default GlobalDataLoader;
