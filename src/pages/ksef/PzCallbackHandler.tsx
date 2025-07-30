import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE = "/functions"; // Adjust if your Edge Functions are mounted elsewhere

export default function PzCallbackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const state = params.get("state");
    const invoiceId = params.get("invoiceId");

    if (!code || !invoiceId) {
      navigate("/invoices?error=pz-callback-missing-params");
      return;
    }

    // Call the Edge Function to process the signed XML
    fetch(`${API_BASE}/pz-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || "")}&invoiceId=${encodeURIComponent(invoiceId)}`)
      .then(() => {
        // Optionally, trigger submit-ksef here
        fetch(`${API_BASE}/submit-ksef`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invoiceId }),
        })
        .then(() => {
          navigate(`/invoices/${invoiceId}?ksef_signed=1`);
        });
      });
  }, [location, navigate]);

  return <div>Przetwarzanie podpisu Profil Zaufany...</div>;
}
