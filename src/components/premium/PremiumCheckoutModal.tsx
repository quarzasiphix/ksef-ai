import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface PremiumCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PremiumCheckoutModal: React.FC<PremiumCheckoutModalProps> = ({ isOpen, onClose }) => {
   const { user, supabase } = useAuth(); // Get user and supabase client
   const [priceDetails, setPriceDetails] = useState<any>(null); // State to store price details
   const [isLoadingPrice, setIsLoadingPrice] = useState(true); // Loading state for price fetch
   const [errorFetchingPrice, setErrorFetchingPrice] = useState<string | null>(null); // Error state for price fetch

   // Define the Stripe Price ID for the premium subscription
   const priceId = "price_1RUC3sQdcZQu3wLBGkQywvga"; // Replace with your actual Price ID

   useEffect(() => {
    if (!isOpen || !supabase) { // Only fetch if modal is open and supabase is available
        return;
    }

    const fetchPrice = async () => {
        setIsLoadingPrice(true);
        setErrorFetchingPrice(null);
        try {
            // Call the Supabase Edge Function to get price details
            const { data, error } = await supabase.functions.invoke('get-stripe-price', {
                method: 'POST',
                body: { priceId: priceId },
            });

            if (error) {
                console.error("Error fetching price details:", error);
                setErrorFetchingPrice(error.message || "Failed to fetch price.");
            } else if (data) {
                 // Assuming data contains price details, e.g., data.unit_amount and data.currency
                 setPriceDetails(data);
            }
        } catch (error: any) {
            console.error("Error fetching price details:", error);
            setErrorFetchingPrice(error.message || "Failed to fetch price.");
        } finally {
            setIsLoadingPrice(false);
        }
    };

    fetchPrice();

   }, [isOpen, supabase, priceId]); // Re-run effect if modal opens or supabase/priceId changes

  const handleCheckout = async () => {
    // Define the Stripe Price ID for the premium subscription (already defined above)
    // const priceId = "price_1RUC3sQdcZQu3wLBGkQywvga"; 

    if (!user?.id) {
      console.error("User not logged in.");
      toast.error("Musisz być zalogowany, aby kupić subskrypcję."); // Show error to user
      return;
    }

    if (!supabase) {
      console.error("Supabase client not available.");
      toast.error("Wystąpił problem z połączeniem. Spróbuj ponownie później."); // Show error to user
      return;
    }

    try {
      // Call the Supabase Edge Function to create a Stripe Checkout Session using invoke
      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        method: 'POST',
        body: {
          priceId: priceId,
          userId: user.id, // Pass the Supabase user ID
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        toast.error("Nie udało się utworzyć sesji płatności. Spróbuj ponownie."); // Show error to user
        return;
      }

      // Redirect the user to the Stripe checkout page
      if (data && data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL received.");
        toast.error("Nie otrzymano adresu przekierowania płatności."); // Show error to user
      }

    } catch (error) {
      console.error("Error during checkout process:", error);
      toast.error("Wystąpił nieoczekiwany błąd podczas płatności."); // Show error to user
    }
  };

  // Helper function to format price
  const formatPrice = (price: any) => {
    if (!price || !price.unit_amount || !price.currency) return "N/A";
    // Stripe unit_amount is in cents/lowest currency unit, so divide by 100
    const amount = price.unit_amount / 100;
    const currency = price.currency.toUpperCase();
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: currency }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
             <Star className="mr-2 h-5 w-5 text-amber-500" fill="currentColor"/>
             Uzyskaj Subskrypcję Premium
          </DialogTitle>
          <DialogDescription>
            Odblokuj pełne możliwości aplikacji dzięki subskrypcji Premium!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <p>Korzyści z Premium:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nieograniczone profile firmowe</li>
            <li>Zaawansowane raporty</li>
            <li>Priorytetowe wsparcie</li>
            <li>I wiele więcej!</li>
          </ul>
          {isLoadingPrice ? (
              <p>Cena: Ładowanie...</p>
          ) : errorFetchingPrice ? (
              <p>Cena: Błąd ładowania</p>
          ) : priceDetails ? (
              <p>Cena: {formatPrice(priceDetails)}/{priceDetails.recurring?.interval || 'miesiąc'}</p> // Display price and interval
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Anuluj</Button>
          </DialogClose>
           <Button onClick={handleCheckout} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={isLoadingPrice || !!errorFetchingPrice}> {/* Disable button while loading or if error */}
             Kup Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumCheckoutModal; 