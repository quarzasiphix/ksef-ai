
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, ArrowRight, Lock } from "lucide-react";

// Helper to get email provider link
const getEmailProviderLink = (email: string) => {
  if (!email.includes("@")) return "https://mail.google.com";
  const domain = email.split("@")[1].toLowerCase();
  if (domain.includes("gmail.com")) return "https://mail.google.com";
  if (domain.includes("outlook.com") || domain.includes("hotmail.com") || domain.includes("live.com")) return "https://outlook.live.com";
  if (domain.includes("yahoo.com")) return "https://mail.yahoo.com";
  if (domain.includes("icloud.com") || domain.includes("me.com")) return "https://www.icloud.com/mail";
  if (domain.includes("wp.pl")) return "https://poczta.wp.pl";
  if (domain.includes("o2.pl")) return "https://poczta.o2.pl";
  if (domain.includes("interia.pl")) return "https://poczta.interia.pl";
  if (domain.includes("onet.pl")) return "https://poczta.onet.pl";
  // Default to Gmail
  return "https://mail.google.com";
};

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>Google</title>
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.62 1.9-4.73 1.9-3.41 0-6.18-2.8-6.18-6.18s2.77-6.18 6.18-6.18c1.93 0 3.3.73 4.1 1.52l2.6-2.6C16.99 3.2 14.94 2 12.48 2 7.28 2 3.2 6.13 3.2 11.2s4.08 9.2 9.28 9.2c5.08 0 8.53-3.47 8.53-8.75 0-.66-.07-1.25-.16-1.73H12.48z" />
    </svg>
);

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [registered, setRegistered] = useState(false);
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();

  // Store credentials in sessionStorage after registration
  const storeCredentials = (email: string, password: string) => {
    sessionStorage.setItem("pendingEmail", email);
    sessionStorage.setItem("pendingPassword", password);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== repeatPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    if (!acceptTerms) {
      setError("Musisz zaakceptować regulamin i politykę prywatności.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      storeCredentials(email, password);
      setRegistered(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  // Handler for 'Proceed, email verified' button
  const handleProceed = async () => {
    setError(null);
    const pendingEmail = sessionStorage.getItem("pendingEmail") || email;
    const pendingPassword = sessionStorage.getItem("pendingPassword") || password;
    try {
      setLoading(true);
      await login(pendingEmail, pendingPassword);
      sessionStorage.removeItem("pendingEmail");
      sessionStorage.removeItem("pendingPassword");
      navigate("/welcome");
    } catch (err: any) {
      setError("Nie udało się zalogować. Upewnij się, że zweryfikowałeś adres e-mail i spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-lg">
        {registered ? (
          <div className="p-px bg-gradient-to-br from-primary via-emerald-500 to-primary rounded-lg shadow-lg animate-fade-in">
            <Card className="w-full border-0">
              <CardHeader className="text-center">
                <Mail className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="mt-4 text-2xl">Potwierdź swój adres e-mail</CardTitle>
                <CardDescription>
                  Na podany adres <span className="font-semibold text-foreground">{email}</span> wysłaliśmy link aktywacyjny.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Kliknij w link, aby aktywować konto i móc się zalogować.
                </p>
                <Button asChild className="w-full mt-6">
                  <a
                    href={getEmailProviderLink(email)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Otwórz skrzynkę pocztową
                  </a>
                </Button>
                <Button
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={handleProceed}
                  disabled={loading}
                >
                  {loading ? "Logowanie..." : "Kontynuuj, e-mail zweryfikowany"}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-red-500 to-pink-500">
                Zacznij z Ai Faktura
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Wpisz swoje dane, aby utworzyć konto i dołączyć do tysięcy zadowolonych przedsiębiorców.
              </p>
            </div>
            <div className="p-px bg-gradient-to-br from-border to-transparent rounded-lg animate-fade-in">
              <Card className="w-full border-0">
                <CardHeader>
                  <CardTitle>Załóż darmowe konto</CardTitle>
                  <CardDescription>To zajmie tylko chwilę.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
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
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password">Powtórz hasło</Label>
                       <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="repeat-password" type="password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} required placeholder="••••••••" className="pl-10" />
                      </div>
                    </div>
                    {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start space-x-2.5">
                        <Checkbox id="terms" checked={acceptTerms} onCheckedChange={(checked) => setAcceptTerms(!!checked)} className="mt-0.5" required />
                        <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                          Akceptuję <Link to="/policies/tos" target="_blank" className="underline hover:text-primary">Regulamin</Link> oraz <Link to="/policies/privacy" target="_blank" className="underline hover:text-primary">Politykę prywatności</Link>
                        </Label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Tworzenie konta..." : "Załóż konto i przejdź dalej"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>
                </CardContent>
                <div className="relative my-0 px-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">LUB</span>
                  </div>
                </div>
                <CardContent className="pt-4 pb-4">
                  <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading}>
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    Zarejestruj się z Google
                  </Button>
                </CardContent>
                <CardFooter className="text-center text-sm pt-0">
                  <p className="text-muted-foreground w-full">
                    Masz już konto?{' '}
                    <Link to="/auth/login" className="underline hover:text-primary font-medium text-primary">
                      Zaloguj się
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            </div>
             <div className="mt-8 text-center text-muted-foreground text-sm animate-fade-in">
                <p>Dołącz do tysięcy przedsiębiorców, którzy zaufali Ai Faktura.</p>
                <p className="font-medium text-foreground mt-1">Twój sukces to nasz priorytet.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
