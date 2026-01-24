import React, { useEffect, useState } from "react";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useAuth } from "@/shared/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";
import { getStripe } from "@/shared/lib/stripeClient";
import type { Stripe } from "@stripe/stripe-js";

// Use env or fallback to Supabase project ref
const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || "https://rncrzxjyffxmfbnxlqtm.functions.supabase.co";

export function BlikPaymentModal({ isOpen, onClose, amount }) {
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Load Stripe with correct key
      getStripe().then(stripe => {
        if (stripe) {
          setStripePromise(Promise.resolve(stripe));
        }
      });

      if (user?.id) {
        setLoading(true);
        fetch(`${SUPABASE_FUNCTIONS_URL}/create-stripe-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount, // in grosze (e.g., 15000 for 150 PLN)
            userId: user.id,
            email: user.email,
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
    }
  }, [isOpen, user, amount]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-white">
            <Smartphone className="h-7 w-7 text-blue-400" />
            Płatność BLIK
          </DialogTitle>
        </DialogHeader>
        {clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <BlikPaymentForm onClose={onClose} />
          </Elements>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Smartphone className="h-12 w-12 text-blue-400 animate-pulse mb-2" />
            <div className="text-white font-semibold">Ładowanie formularza płatności...</div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} className="border-border text-white hover:text-white hover:bg-blue-500/10">Anuluj</Button>
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-background/50 p-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="h-6 w-6 text-blue-400" />
          <span className="font-semibold text-white">Kod BLIK</span>
        </div>
        <div className="w-full bg-white rounded-lg p-4">
          <PaymentElement options={{ layout: "tabs" }} />
        </div>
      </div>
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
      >
        {submitting ? "Przetwarzanie..." : "Zapłać BLIK"}
      </Button>
    </form>
  );
} 