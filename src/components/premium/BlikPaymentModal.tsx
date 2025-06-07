import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Use the provided live publishable key
const stripePromise = loadStripe("pk_live_51RUBwrHFbUxWftPspR2XyfylCIr3dI8bCKWrWeQZBXs65KV8dJ3JWdu4okrOxjBhwuuwTjCQFlWzJG5191mrHALL00i7TOuLbP");

// Use env or fallback to Supabase project ref
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "https://rncrzxjyffxmfbnxlqtm.functions.supabase.co";

export function BlikPaymentModal({ isOpen, onClose, amount }) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      setLoading(true);
      fetch(`${SUPABASE_FUNCTIONS_URL}/create-stripe-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount, // in grosze (e.g., 15000 for 150 PLN)
          userId: user.id,
          currency: "pln",
          description: "Zakup Premium BLIK"
        }),
      })
        .then(res => res.json())
        .then(data => {
          setClientSecret(data.clientSecret);
        })
        .catch(() => toast.error("Błąd podczas inicjalizacji płatności."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, user, amount]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Płatność BLIK</DialogTitle>
        </DialogHeader>
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <BlikPaymentForm onClose={onClose} />
          </Elements>
        ) : (
          <div>Ładowanie formularza płatności...</div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Anuluj</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlikPaymentForm({ onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href, // or a custom success page
      },
    });

    if (error) {
      toast.error(error.message || "Błąd płatności.");
    } else {
      toast.success("Płatność BLIK zakończona sukcesem!");
      onClose();
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: "tabs" }} />
      <Button type="submit" disabled={!stripe || submitting} className="w-full mt-4">
        {submitting ? "Przetwarzanie..." : "Zapłać BLIK"}
      </Button>
    </form>
  );
} 