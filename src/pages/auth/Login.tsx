import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowRight, Lock, UserCircle } from "lucide-react";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.41 0-6.18-2.8-6.18-6.18s2.77-6.18 6.18-6.18c1.93 0 3.3.73 4.1 1.52l2.6-2.6C16.99 3.2 14.94 2 12.48 2 7.28 2 3.2 6.13 3.2 11.2s4.08 9.2 9.28 9.2c5.08 0 8.53-3.47 8.53-8.75 0-.66-.07-1.25-.16-1.73H12.48z" />
    </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await login(email, password);
      if (user) {
        setCheckingOnboarding(true);
        const profiles = await getBusinessProfiles(user.id);
        setCheckingOnboarding(false);
        if (profiles.length === 0) {
          navigate("/welcome");
        } else {
          navigate("/dashboard");
        }
      }
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
        await signInWithGoogle();
    } catch (err: any) {
        setError("Nie udało się zalogować przez Google.");
        console.error('Google login error:', err);
    } finally {
        setLoading(false);
    }
  };

  const handleTestAccountLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { user } = await login('test@quarza.online', 'nigga123');
      if (user) {
        setCheckingOnboarding(true);
        const profiles = await getBusinessProfiles(user.id);
        setCheckingOnboarding(false);
        if (profiles.length === 0) {
          navigate("/welcome");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      setError("Nie udało się zalogować na konto testowe.");
      console.error('Test account login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-12">
      <div className="w-full max-w-lg">
          <>
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-red-500 to-pink-500">
                Witaj z powrotem!
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Zaloguj się, aby kontynuować zarządzanie swoim biznesem.
              </p>
            </div>

            {checkingOnboarding ? (
              <div className="flex items-center justify-center py-8">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-foreground">Sprawdzanie konfiguracji konta...</span>
              </div>
            ) : (
            <div className="p-px bg-gradient-to-br from-border to-transparent rounded-lg animate-fade-in">
              <Card className="w-full border-0">
                <CardHeader>
                  <CardTitle>Zaloguj się do swojego konta</CardTitle>
                  <CardDescription>Wpisz swoje dane, aby uzyskać dostęp.</CardDescription>
                </CardHeader>
                 <CardContent className="pt-4 pb-4 space-y-2">
                  <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading}>
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    Zaloguj się z Google
                  </Button>
                   <Button variant="secondary" className="w-full" onClick={handleTestAccountLogin} disabled={loading}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    Kontynuuj jako tester
                  </Button>
                </CardContent>
                <div className="relative my-0 px-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">LUB UŻYJ ADRESU E-MAIL</span>
                  </div>
                </div>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@przyklad.com" className="pl-10" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Hasło</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="pl-10" />
                      </div>
                    </div>
                    {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && email !== 'test@quarza.online' ? "Logowanie..." : "Zaloguj się"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="text-center text-sm pt-0">
                  <p className="text-muted-foreground w-full">
                    Nie masz jeszcze konta?{' '}
                    <Link to="/auth/register" className="underline hover:text-primary font-medium text-primary">
                      Załóż darmowe konto
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </div>
            )}
             <div className="mt-8 text-center text-muted-foreground text-sm animate-fade-in">
                <p>Twoje dane są u nas bezpieczne.</p>
                <p className="font-medium text-foreground mt-1">Logowanie jest szyfrowane.</p>
            </div>
          </>
      </div>
    </div>
  );
};

export default Login;
