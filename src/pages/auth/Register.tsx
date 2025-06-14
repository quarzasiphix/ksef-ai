
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, ArrowRight } from "lucide-react";

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

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptPrivacyPolicy, setAcceptPrivacyPolicy] = useState(false);
  const [acceptTOS, setAcceptTOS] = useState(false);
  const [registered, setRegistered] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

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
      storeCredentials(email, password);
      setRegistered(true);
    }
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
          <Card className="w-full">
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
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100">
                Zacznij korzystać z najlepszego systemu do fakturowania dla małych firm
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Wpisz swoje dane logowania, a my rozpoczniemy proces konfiguracji konta.
              </p>
            </div>
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Załóż darmowe konto</CardTitle>
                <CardDescription>To zajmie tylko chwilę.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@przyklad.com" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Hasło</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Powtórz hasło</Label>
                    <Input id="repeat-password" type="password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} required placeholder="••••••••" />
                  </div>
                  {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start space-x-2.5">
                      <Checkbox id="privacy" checked={acceptPrivacyPolicy} onCheckedChange={(checked) => setAcceptPrivacyPolicy(!!checked)} className="mt-0.5" required />
                      <Label htmlFor="privacy" className="text-sm font-normal text-muted-foreground">
                        Akceptuję <Link to="/policies/privacy" target="_blank" className="underline hover:text-primary">Politykę prywatności</Link>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <Checkbox id="tos" checked={acceptTOS} onCheckedChange={(checked) => setAcceptTOS(!!checked)} className="mt-0.5" required />
                      <Label htmlFor="tos" className="text-sm font-normal text-muted-foreground">
                        Akceptuję <Link to="/policies/tos" target="_blank" className="underline hover:text-primary">Regulamin serwisu</Link>
                      </Label>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Tworzenie konta..." : "Załóż konto i przejdź dalej"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="text-center text-sm">
                <p className="text-muted-foreground w-full">
                  Masz już konto?{' '}
                  <Link to="/auth/login" className="underline hover:text-primary font-medium text-primary">
                    Zaloguj się
                  </Link>
                </p>
              </CardFooter>
            </Card>
             <div className="mt-8 text-center text-muted-foreground text-sm">
                <p>Dołącz do tysięcy przedsiębiorców, którzy zaufali KsiegaI.</p>
                <p className="font-medium text-foreground mt-1">Twój sukces to nasz priorytet.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
