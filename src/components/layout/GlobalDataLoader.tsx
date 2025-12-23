
import React, { useEffect, useState } from "react";
import { useGlobalData } from "@/shared/hooks/use-global-data";
import { toast } from "sonner";
import { Loader } from "lucide-react";

const GlobalDataLoader: React.FC = () => {
  const { isLoading, refreshAllData } = useGlobalData();
  const [initialLoad, setInitialLoad] = useState(true);
  
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Only load data once when the app first starts
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
    
    // We're disabling periodic refreshes to prevent unnecessary data fetching
    // Data will only be refreshed when explicitly requested or when a mutation occurs
    
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
