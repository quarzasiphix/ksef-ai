import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Textarea } from '@/shared/ui/textarea';
import { 
  ArrowLeft, 
  Users, 
  UserPlus, 
  Mail, 
  Shield, 
  Clock, 
  MoreVertical,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import {
  getCompanyMembers,
  getInvitationsForProfile,
  sendInvitation,
  cancelInvitation,
  removeMember,
  CompanyMember,
  CompanyInvitation,
} from '@/integrations/supabase/repositories/invitationRepository';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

const TeamManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedProfileId, selectedProfile } = useBusinessProfile();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'accountant' | 'pelnomocnik' | 'viewer'>('accountant');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch team members
  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['companyMembers', selectedProfileId],
    queryFn: () => selectedProfileId ? getCompanyMembers(selectedProfileId) : Promise.resolve([]),
    enabled: !!selectedProfileId,
  });

  // Fetch pending invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['companyInvitations', selectedProfileId],
    queryFn: () => selectedProfileId ? getInvitationsForProfile(selectedProfileId) : Promise.resolve([]),
    enabled: !!selectedProfileId,
  });

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const handleSendInvitation = async () => {
    if (!selectedProfileId) return;
    if (!inviteEmail.trim()) {
      toast.error('Podaj adres email');
      return;
    }

    setSending(true);
    try {
      const result = await sendInvitation(selectedProfileId, inviteEmail, inviteRole, inviteMessage || undefined);
      if (result.success) {
        toast.success(`Zaproszenie wysłane do ${inviteEmail}`);
        setInviteDialogOpen(false);
        setInviteEmail('');
        setInviteRole('accountant');
        setInviteMessage('');
        queryClient.invalidateQueries({ queryKey: ['companyInvitations', selectedProfileId] });
      } else {
        toast.error(result.error || 'Nie udało się wysłać zaproszenia');
      }
    } catch (error) {
      toast.error('Wystąpił błąd');
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const success = await cancelInvitation(invitationId);
    if (success) {
      toast.success('Zaproszenie anulowane');
      queryClient.invalidateQueries({ queryKey: ['companyInvitations', selectedProfileId] });
    } else {
      toast.error('Nie udało się anulować zaproszenia');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const success = await removeMember(memberId);
    if (success) {
      toast.success(`${memberName} został usunięty z zespołu`);
      queryClient.invalidateQueries({ queryKey: ['companyMembers', selectedProfileId] });
    } else {
      toast.error('Nie udało się usunąć członka zespołu');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Właściciel';
      case 'admin': return 'Administrator';
      case 'accountant': return 'Księgowy';
      case 'pelnomocnik': return 'Pełnomocnik';
      case 'viewer': return 'Podgląd';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'destructive';
      case 'accountant': return 'secondary';
      case 'pelnomocnik': return 'outline';
      default: return 'secondary';
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  if (!selectedProfileId) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Zespół</h1>
            <p className="text-muted-foreground">Zarządzaj członkami zespołu</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Wybierz firmę, aby zarządzać zespołem</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Zespół</h1>
            <p className="text-muted-foreground">
              Zarządzaj członkami zespołu dla {selectedProfile?.name}
            </p>
          </div>
        </div>

        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Zaproś osobę
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Zaproś do zespołu</DialogTitle>
              <DialogDescription>
                Wyślij zaproszenie do współpracy. Osoba otrzyma email z linkiem do akceptacji.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adres email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jan.kowalski@firma.pl"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rola</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span>Administrator</span>
                        <span className="text-xs text-muted-foreground">Pełny dostęp, może zapraszać innych</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="accountant">
                      <div className="flex flex-col items-start">
                        <span>Księgowy</span>
                        <span className="text-xs text-muted-foreground">Dostęp do faktur, wydatków, raportów</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pelnomocnik">
                      <div className="flex flex-col items-start">
                        <span>Pełnomocnik</span>
                        <span className="text-xs text-muted-foreground">Reprezentant prawny firmy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col items-start">
                        <span>Podgląd</span>
                        <span className="text-xs text-muted-foreground">Tylko odczyt danych</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Wiadomość (opcjonalnie)</Label>
                <Textarea
                  id="message"
                  placeholder="Cześć! Zapraszam Cię do współpracy..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={handleSendInvitation} disabled={sending}>
                {sending ? 'Wysyłanie...' : 'Wyślij zaproszenie'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Członkowie zespołu
          </CardTitle>
          <CardDescription>
            Osoby mające dostęp do tej firmy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak członków zespołu
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.profile?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(member.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {member.profile?.full_name || 'Użytkownik'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Dołączył: {new Date(member.joined_at).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Usuń z zespołu
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Usunąć członka zespołu?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {member.profile?.full_name || 'Ten użytkownik'} straci dostęp do tej firmy.
                                  Tej operacji nie można cofnąć.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={() => handleRemoveMember(member.id, member.profile?.full_name || 'Użytkownik')}
                                >
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Oczekujące zaproszenia
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary">{pendingInvitations.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Zaproszenia oczekujące na akceptację
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvitations ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak oczekujących zaproszeń
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Wygasa: {new Date(invitation.expires_at).toLocaleDateString('pl-PL')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getRoleLabel(invitation.role)}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(invitation.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Uprawnienia ról
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge>Właściciel</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Pełny dostęp do wszystkich funkcji, zarządzanie zespołem i ustawieniami firmy.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive">Administrator</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Pełny dostęp operacyjny, może zapraszać nowych członków zespołu.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Księgowy</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Dostęp do faktur, wydatków, dokumentów finansowych i raportów.
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">Pełnomocnik</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Reprezentant prawny firmy, dostęp do dokumentów i decyzji.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamManagement;
