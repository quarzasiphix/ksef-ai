import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/shared/hooks/useAuth';
import { useABTest } from '@/shared/hooks/useABTest';
import { useFunnelTracking } from '@/shared/hooks/useFunnelTracking';
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Mail, ArrowRight, Lock, ChevronDown } from "lucide-react";
import { getBusinessProfiles } from '@/integrations/supabase/repositories/businessProfileRepository';
import { FunnelEvents } from '@/shared/lib/analytics/funnelTracker';

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
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const { login, signInWithGoogle } = useAuth();
  
  // A/B Testing
  const headlineVariant = useABTest({
    testId: 'registration_headline',
    variants: ['control', 'variant_a'],
  });
  
  // Funnel Tracking
  const { track } = useFunnelTracking('/auth/register');

  // Handle auth state changes (magic link callback)
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const profiles = await getBusinessProfiles(session.user.id);
        if (profiles.length === 0) {
          navigate('/welcome');
        } else {
          navigate('/dashboard');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Magic link registration
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    track(FunnelEvents.CLICKED_CONTINUE_BUTTON);
    setError(null);

    if (!email) {
      setError("Podaj adres e-mail");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError("Nie udało się wysłać linku. Spróbuj ponownie lub ustaw hasło.");
      track(FunnelEvents.ERROR_SENDING_MAGIC_LINK, { error: error.message });
    } else {
      setMagicLinkSent(true);
      setResendCooldown(60);
      track(FunnelEvents.MAGIC_LINK_SENT, { email });
    }
  };

  // Password registration (fallback)
  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (password !== repeatPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    if (password.length < 6) {
      setError("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    setLoading(false);
    
    if (error) {
      setError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  // Resend magic link
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    track(FunnelEvents.CLICKED_RESEND_LINK);
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setError("Nie udało się wysłać linku. Spróbuj ponownie.");
      track(FunnelEvents.ERROR_SENDING_MAGIC_LINK, { error: error.message, resend: true });
    } else {
      setResendCooldown(60);
      track(FunnelEvents.MAGIC_LINK_SENT, { email, resend: true });
    }
  };

  const handleGoogleSignIn = async () => {
    track(FunnelEvents.CLICKED_GOOGLE_BUTTON);
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError("Nie udało się zalogować przez Google. Spróbuj ponownie.");
      track(FunnelEvents.ERROR_GOOGLE_SIGNIN, { error: String(err) });
    }
    setLoading(false);
  };


  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full max-w-lg">
        {magicLinkSent ? (
          <Card className="w-full animate-fade-in">
            <CardHeader className="text-center">
              <Mail className="mx-auto h-12 w-12 text-blue-600" />
              <CardTitle className="mt-4 text-2xl">Sprawdź swoją skrzynkę</CardTitle>
              <CardDescription className="text-base">
                Wysłaliśmy link na adres <span className="font-semibold text-foreground">{email}</span>.<br />
                Kliknij w link, aby kontynuować — zajmie to sekundę.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <a
                  href={getEmailProviderLink(email)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Otwórz skrzynkę pocztową
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                size="lg"
              >
                {resendCooldown > 0 
                  ? `Wyślij ponownie (${resendCooldown}s)` 
                  : "E-mail nie dotarł? Wyślij ponownie"}
              </Button>
              
              {!showPasswordForm ? (
                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowPasswordForm(true)}
                >
                  Lub ustaw hasło i zaloguj się standardowo
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="pt-4 border-t space-y-4">
                  <p className="text-sm text-muted-foreground text-center">Ustaw hasło, aby zalogować się bez linku</p>
                  <form onSubmit={handlePasswordRegister} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="password-fallback">Hasło</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password-fallback" 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                          placeholder="••••••••" 
                          className="pl-10" 
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="repeat-password-fallback">Powtórz hasło</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="repeat-password-fallback" 
                          type="password" 
                          value={repeatPassword} 
                          onChange={(e) => setRepeatPassword(e.target.value)} 
                          required 
                          placeholder="••••••••" 
                          className="pl-10" 
                        />
                      </div>
                    </div>
                    {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Rejestracja..." : "Zarejestruj się z hasłem"}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {headlineVariant === 'variant_a'
                  ? 'Jeszcze chwila — i księgowość masz z głowy.'
                  : 'Jeszcze chwila i masz to z głowy.'}
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                🇵🇱 Dla polskich przedsiębiorców • zgodne z KSeF
              </p>
              <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
                Załóż konto, a KsięgaI zajmie się resztą.
              </p>
            </div>
            <Card className="w-full animate-fade-in">
              <CardContent className="pt-6 pb-4 space-y-4">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700" 
                  onClick={handleGoogleSignIn} 
                  disabled={loading}
                  size="lg"
                >
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Kontynuuj przez Google
                </Button>
                
                {!showPasswordForm ? (
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setShowPasswordForm(true);
                      track(FunnelEvents.EXPANDED_EMAIL_FORM);
                    }}
                  >
                    Użyj adresu e-mail
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <div className="pt-4 border-t">
                    <form onSubmit={handleMagicLink} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">Adres e-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="email" 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => track(FunnelEvents.FOCUSED_EMAIL_FIELD)}
                            required 
                            placeholder="twoj@email.pl" 
                            className="pl-10" 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Wyślemy Ci bezpieczny link do logowania.
                        </p>
                      </div>
                      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
                      <Button type="submit" className="w-full" disabled={loading} size="lg">
                        {loading ? "Wysyłanie..." : "Kontynuuj"}
                        {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Kontynuując, akceptujesz{' '}
                        <Link to="/policies/tos" target="_blank" className="underline hover:text-primary">
                          Regulamin
                        </Link>
                        {' '}i{' '}
                        <Link to="/policies/privacy" target="_blank" className="underline hover:text-primary">
                          Politykę prywatności
                        </Link>
                      </p>
                    </form>
                  </div>
                )}
              </CardContent>
              <CardContent className="pt-0">
                <p className="text-sm text-center text-muted-foreground">
                  Po rejestracji możesz od razu wystawić pierwszą fakturę.
                </p>
              </CardContent>
              <CardFooter className="flex-col space-y-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center w-full">
                  Masz już konto?{' '}
                  <Link to="/auth/login" className="underline hover:text-primary font-medium text-primary">
                    Zaloguj się
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <span>🇵🇱</span>
                    <span>Aplikacja w języku polskim</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🇵🇱</span>
                    <span>Zgodna z KSeF</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span>🇵🇱</span>
                    <span>Dla polskich przedsiębiorców</span>
                  </span>
                </div>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Register;
