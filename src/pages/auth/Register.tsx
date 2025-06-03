import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptTOS, setAcceptTOS] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== repeatPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    if (!acceptPrivacyPolicy || !acceptTOS) {
      setError("Musisz zaakceptować politykę prywatności i regulamin.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/auth/login");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900">
      <h1 className="text-3xl font-extrabold text-white text-center mb-8">Witam w KsiegaI</h1>
      <form onSubmit={handleRegister} className="bg-neutral-800 p-8 rounded shadow-md w-full max-w-sm border border-neutral-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Załóż konto</h2>
        <div className="mb-4">
          <label className="block mb-1 text-neutral-200">Email</label>
          <input
            type="email"
            className="w-full border border-neutral-700 bg-neutral-900 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 text-neutral-200">Hasło</label>
          <input
            type="password"
            className="w-full border border-neutral-700 bg-neutral-900 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block mb-1 text-neutral-200">Powtórz hasło</label>
          <input
            type="password"
            className="w-full border border-neutral-700 bg-neutral-900 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <div className="mb-4 space-y-3">
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={acceptPrivacyPolicy}
              onChange={(e) => setAcceptPrivacyPolicy(e.target.checked)}
              className="mt-1"
              required
            />
            <span className="text-neutral-400 text-sm">
              Akceptuję <a href="/policies/privacy" target="_blank" className="text-primary hover:underline">Politykę prywatności</a>
            </span>
          </label>
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={acceptTOS}
              onChange={(e) => setAcceptTOS(e.target.checked)}
              className="mt-1"
              required
            />
            <span className="text-neutral-400 text-sm">
              Akceptuję <a href="/policies/tos" target="_blank" className="text-primary hover:underline">Regulamin serwisu</a>
            </span>
          </label>
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary-dark disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Zakładanie..." : "Załóż konto"}
        </button>
        <div className="mt-6 text-center">
          <span className="text-neutral-400">Masz już konto?</span>
          <button
            type="button"
            className="ml-2 text-primary hover:underline text-sm"
            onClick={() => navigate("/auth/login")}
          >
            Zaloguj się
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
