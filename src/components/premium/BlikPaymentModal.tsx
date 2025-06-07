import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Smartphone } from "lucide-react";

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
  }, [isOpen, user, amount]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-gradient-to-br from-pink-50 via-white to-amber-50 border-amber-200 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl text-amber-700">
            <Smartphone className="h-7 w-7 text-pink-600" />
            Płatność BLIK
          </DialogTitle>
        </DialogHeader>
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <BlikPaymentForm onClose={onClose} />
          </Elements>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <Smartphone className="h-12 w-12 text-pink-400 animate-pulse mb-2" />
            <div className="text-amber-700 font-semibold">Ładowanie formularza płatności...</div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose} className="border-amber-300 text-amber-700">Anuluj</Button>
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
      <div className="rounded-lg border border-pink-200 bg-white/80 p-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="h-6 w-6 text-pink-600" />
          <span className="font-semibold text-pink-700">Kod BLIK</span>
        </div>
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md"
      >
        {submitting ? "Przetwarzanie..." : "Zapłać BLIK"}
      </Button>
    </form>
  );
} 