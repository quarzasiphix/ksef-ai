import React, { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Plus, Trash2, Edit2, Users, Building2 } from "lucide-react";
import { ClientGroup } from "../types/clientGroup";
import { getClientGroups, deleteClientGroup, getCustomerCountByGroup } from "../data/clientGroupRepository";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useAuth } from "@/shared/context/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/shared/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { ClientGroupForm } from "./ClientGroupForm";
import { CLIENT_GROUP_TYPE_LABELS } from "../types/clientGroup";

interface ClientGroupManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupsChanged?: () => void;
}

export function ClientGroupManager({ isOpen, onClose, onGroupsChanged }: ClientGroupManagerProps) {
  const { selectedProfileId } = useBusinessProfile();
  const { user } = useAuth();
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [customerCounts, setCustomerCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<ClientGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);

  React.useEffect(() => {
    if (isOpen && selectedProfileId) {
      loadGroups();
    }
  }, [isOpen, selectedProfileId]);

  const loadGroups = async () => {
    if (!selectedProfileId) return;
    
    setIsLoading(true);
    try {
      const data = await getClientGroups(selectedProfileId);
      setGroups(data);
      
      // Load customer counts for each group
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (group) => {
          const count = await getCustomerCountByGroup(group.id);
          counts[group.id] = count;
        })
      );
      setCustomerCounts(counts);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Błąd podczas ładowania grup");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClientGroup(groupToDelete.id);
      toast.success("Grupa została usunięta");
      setGroupToDelete(null);
      await loadGroups();
      onGroupsChanged?.();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Błąd podczas usuwania grupy");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGroupFormSuccess = async () => {
    setShowGroupForm(false);
    setEditingGroup(null);
    await loadGroups();
    onGroupsChanged?.();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'administration':
        return <Building2 className="h-4 w-4" />;
      case 'country':
        return <span className="text-sm">🌍</span>;
      case 'direct_client':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Zarządzaj grupami klientów</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Grupuj klientów według administracji, regionów lub portfolio
              </p>
              <Button onClick={() => setShowGroupForm(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nowa grupa
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ładowanie grup...
              </div>
            ) : groups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nie masz jeszcze żadnych grup klientów
                  </p>
                  <Button onClick={() => setShowGroupForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Utwórz pierwszą grupę
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {groups.map((group) => (
                  <Card key={group.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1">
                            {getTypeIcon(group.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{group.name}</CardTitle>
                              {group.invoice_prefix && (
                                <Badge variant="secondary" className="font-mono">
                                  {group.invoice_prefix}
                                </Badge>
                              )}
                            </div>
                            <CardDescription>
                              {CLIENT_GROUP_TYPE_LABELS[group.type]}
                              {group.description && ` • ${group.description}`}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGroup(group);
                              setShowGroupForm(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGroupToDelete(group)}
                            disabled={customerCounts[group.id] > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>
                            {customerCounts[group.id] || 0} klientów
                          </span>
                        </div>
                        {group.default_payment_terms && (
                          <div>
                            Termin płatności: {group.default_payment_terms} dni
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Form Dialog */}
      <Dialog open={showGroupForm} onOpenChange={(open) => {
        if (!open) {
          setShowGroupForm(false);
          setEditingGroup(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edytuj grupę" : "Nowa grupa klientów"}
            </DialogTitle>
          </DialogHeader>
          <ClientGroupForm
            initialData={editingGroup || undefined}
            onSubmit={async (data) => {
              if (!selectedProfileId || !user?.id) return;
              
              try {
                if (editingGroup) {
                  const { updateClientGroup } = await import("../data/clientGroupRepository");
                  await updateClientGroup(editingGroup.id, data as any);
                  toast.success("Grupa została zaktualizowana");
                } else {
                  const { createClientGroup } = await import("../data/clientGroupRepository");
                  await createClientGroup(data as any, selectedProfileId, user.id);
                  toast.success("Grupa została utworzona");
                }
                handleGroupFormSuccess();
              } catch (error) {
                console.error("Error saving group:", error);
                toast.error("Błąd podczas zapisywania grupy");
              }
            }}
            onCancel={() => {
              setShowGroupForm(false);
              setEditingGroup(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć tę grupę?</AlertDialogTitle>
            <AlertDialogDescription>
              Grupa "{groupToDelete?.name}" zostanie usunięta. Klienci przypisani do tej grupy
              nie zostaną usunięci, ale stracą przypisanie do grupy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Usuwanie..." : "Usuń"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
