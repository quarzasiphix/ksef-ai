
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Initial check
    setMatches(media.matches);
    
    // Create listener
    const listener = () => {
      setMatches(media.matches);
    };
    
    // Add listener
    media.addEventListener("change", listener);
    
    // Clean up
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}

// Add the useIsMobile hook that returns true when screen width is less than 768px (md breakpoint)
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
