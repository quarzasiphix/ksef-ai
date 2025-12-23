import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PasswordSetup = () => {
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== repeatPassword) {
      setError('Hasła muszą być takie same.');
      return;
    }

    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    setLoading(false);

    if (error) {
      setError('Nie udało się ustawić hasła. Spróbuj ponownie.');
      toast.error('Nie udało się ustawić hasła');
    } else {
      setSuccess(true);
      toast.success('Hasło zostało ustawione');
      setPassword('');
      setRepeatPassword('');
    }
  };

  if (success) {
    return (
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <CardTitle>Hasło ustawione</CardTitle>
          <CardDescription>
            Możesz teraz logować się używając hasła zamiast linku e-mail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Ustaw hasło</CardTitle>
        <CardDescription>
          Hasło pozwoli Ci logować się bez linku e-mail. To opcjonalne — możesz nadal używać magic link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Nowe hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
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
            <Label htmlFor="repeat-password">Powtórz hasło</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="repeat-password"
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
            {loading ? 'Ustawianie...' : 'Ustaw hasło'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Możesz zmienić hasło w każdej chwili w ustawieniach konta.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

export default PasswordSetup;
