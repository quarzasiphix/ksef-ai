import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/App";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithCredentials(email, password);
  };

  const loginWithCredentials = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.session) {
        // The auth state change handler will handle the rest
        navigate("/");
      }
    } catch (err) {
      setError('Wystąpił błąd podczas logowania');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccountLogin = async () => {
    await loginWithCredentials('test@quarza.online', 'nigga123');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900">
      <h1 className="text-3xl font-extrabold text-white text-center mb-8">Witam w Ai Faktura</h1>
      <form onSubmit={handleLogin} className="bg-neutral-800 p-8 rounded shadow-md w-full max-w-sm border border-neutral-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-white">Zaloguj się</h2>
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
        <div className="mb-6">
          <label className="block mb-1 text-neutral-200">Hasło</label>
          <input
            type="password"
            className="w-full border border-neutral-700 bg-neutral-900 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        <button
          type="submit"
          className="w-full bg-primary text-white py-2 rounded hover:bg-primary-dark disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Logowanie..." : "Zaloguj się"}
        </button>
        <div className="mt-6 text-center">
          <span className="text-neutral-400">Nie masz konta?</span>
          <button
            type="button"
            className="ml-2 text-primary hover:underline text-sm"
            onClick={() => navigate("/auth/register")}
          >
            Załóż konto
          </button>
        </div>
      </form>
      <div className="mt-8 w-full max-w-sm">
        <button
          onClick={handleTestAccountLogin}
          disabled={loading}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors duration-200 disabled:opacity-60"
        >
          {loading ? 'Logowanie...' : 'Kontynuuj jako tester'}
        </button>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Konto testowe zawiera przykładowe dane
        </p>
      </div>
    </div>
  );
};

export default Login;
