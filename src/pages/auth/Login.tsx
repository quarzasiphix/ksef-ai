import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, AlertCircle, UserCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
      if (err.message.includes("Invalid login credentials")) {
        setError("Nieprawidłowy email lub hasło.");
      } else {
        setError("Wystąpił błąd podczas logowania. Spróbuj ponownie.");
      }
      console.error('Login error details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAccountLogin = async () => {
    await login('test@quarza.online', 'nigga123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <LogIn className="mx-auto text-primary h-16 w-16 mb-4" />
          <h1 className="text-4xl font-bold text-white">Witaj w KsiegaI</h1>
          <p className="text-neutral-400 mt-2">Zaloguj się, aby kontynuować.</p>
        </div>

        <form 
          onSubmit={handleLogin} 
          className="bg-neutral-800/70 backdrop-blur-sm p-8 rounded-xl shadow-2xl border border-neutral-700 space-y-6"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-1.5">
              Adres Email
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full border border-neutral-700 bg-neutral-900/80 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200 shadow-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="twoj@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-300 mb-1.5">
              Hasło
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="w-full border border-neutral-700 bg-neutral-900/80 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow duration-200 shadow-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logowanie...
              </>
            ) : (
              "Zaloguj się"
            )}
          </button>

          <div className="text-center">
            <span className="text-neutral-400 text-sm">Nie masz konta? </span>
            <button
              type="button"
              className="font-medium text-primary hover:text-primary/80 text-sm transition-colors duration-200"
              onClick={() => navigate("/auth/register")}
            >
              Załóż konto
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
           <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-neutral-700"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-neutral-800/70 px-3 text-sm text-neutral-400 rounded-md">Lub</span>
            </div>
          </div>

          <button
            onClick={handleTestAccountLogin}
            disabled={loading}
            className="w-full bg-amber-600/80 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center"
          >
            <UserCircle className="h-5 w-5 mr-2" />
            {loading && email === 'test@quarza.online' ? 'Logowanie...' : 'Kontynuuj jako tester'}
          </button>
          <p className="mt-3 text-xs text-neutral-500">
            Konto testowe zawiera przykładowe dane do demonstracji.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
