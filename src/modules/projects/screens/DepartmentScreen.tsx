import React, { useState, useEffect } from "react";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useAuth } from "@/shared/context/AuthContext";
import { useProjectScope } from "@/shared/context/ProjectContext";
import { Department, DepartmentStats } from "@/shared/types";
import {
  getDepartments,
  getDepartmentStats,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  freezeDepartment,
  unfreezeDepartment,
  closeDepartment,
  archiveDepartment,
  reopenDepartment,
} from "../data/projectRepository";
import { DepartmentCard } from "../components/DepartmentCard";
import { DepartmentDialog } from "../components/DepartmentDialog";
import { Button } from "@/shared/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const DepartmentScreen: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { user } = useAuth();
  const { refreshProjects } = useProjectScope();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    if (selectedProfileId) {
      loadDepartments();
    }
  }, [selectedProfileId]);

  const loadDepartments = async () => {
    if (!selectedProfileId) return;

    try {
      setLoading(true);
      const [departmentsData, statsData] = await Promise.all([
        getDepartments(selectedProfileId),
        getDepartmentStats(selectedProfileId),
      ]);
      setDepartments(departmentsData);
      setDepartmentStats(Array.isArray(statsData) ? statsData : []);
    } catch (error) {
      console.error("Error loading departments:", error);
      toast.error("Nie udało się załadować działów");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = () => {
    setSelectedDepartment(null);
    setDialogOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setDialogOpen(true);
  };

  const handleSaveDepartment = async (data: any) => {
    if (!selectedProfileId || !user) return;

    try {
      if (selectedDepartment) {
        await updateDepartment(selectedDepartment.id, data);
        toast.success("Dział zaktualizowany");
      } else {
        await createDepartment({
          ...data,
          business_profile_id: selectedProfileId,
          created_by: user.id,
          status: "active",
        });
        toast.success("Dział utworzony");
      }
      setDialogOpen(false);
      loadDepartments();
      // Refresh projects to update DepartmentSwitcher
      await refreshProjects();
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error("Nie udało się zapisać działu");
    }
  };

  const handleDeleteDepartment = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDepartment = async () => {
    if (!departmentToDelete) return;

    try {
      await deleteDepartment(departmentToDelete.id);
      toast.success("Dział usunięty");
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
      loadDepartments();
      // Refresh projects to update DepartmentSwitcher
      await refreshProjects();
    } catch (error) {
      console.error("Error deleting department:", error);
      toast.error("Nie udało się usunąć działu");
    }
  };

  const handleFreezeDepartment = async (department: Department) => {
    if (!user) return;

    try {
      await freezeDepartment(department.id, user.id);
      toast.success("Dział zamrożony");
      loadDepartments();
      await refreshProjects();
    } catch (error) {
      console.error("Error freezing department:", error);
      toast.error("Nie udało się zamrozić działu");
    }
  };

  const handleUnfreezeDepartment = async (department: Department) => {
    try {
      await unfreezeDepartment(department.id);
      toast.success("Dział odblokowany");
      loadDepartments();
      await refreshProjects();
    } catch (error) {
      console.error("Error unfreezing department:", error);
      toast.error("Nie udało się odblokować działu");
    }
  };

  const handleCloseDepartment = async (department: Department) => {
    if (!user) return;

    try {
      await closeDepartment(department.id, user.id);
      toast.success("Dział zamknięty");
      loadDepartments();
      await refreshProjects();
    } catch (error) {
      console.error("Error closing department:", error);
      toast.error("Nie udało się zamknąć działu");
    }
  };

  const handleArchiveDepartment = async (department: Department) => {
    try {
      await archiveDepartment(department.id);
      toast.success("Dział zarchiwizowany");
      loadDepartments();
      await refreshProjects();
    } catch (error) {
      console.error("Error archiving department:", error);
      toast.error("Nie udało się zarchiwizować działu");
    }
  };

  const handleReopenDepartment = async (department: Department) => {
    try {
      await reopenDepartment(department.id);
      toast.success("Dział otwarty ponownie");
      loadDepartments();
      await refreshProjects();
    } catch (error) {
      console.error("Error reopening department:", error);
      toast.error("Nie udało się otworzyć działu ponownie");
    }
  };

  const getDepartmentStats = (departmentId: string): DepartmentStats | undefined => {
    if (!departmentStats || departmentStats.length === 0) return undefined;
    return departmentStats.find((s) => s.department_id === departmentId);
  };

  const filteredDepartments = departments.filter((department) => {
    if (activeTab === "all") return true;
    return department.status === activeTab;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Ładowanie projektów...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Działy</h1>
          <p className="text-muted-foreground mt-1">
            Organizuj działalność biznesową w logiczne działy
          </p>
        </div>
        <Button onClick={handleCreateDepartment}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy dział
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie ({departments.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktywne ({departments.filter((p) => p.status === "active").length})
          </TabsTrigger>
          <TabsTrigger value="frozen">
            Zamrożone ({departments.filter((p) => p.status === "frozen").length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Zamknięte ({departments.filter((p) => p.status === "closed").length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Zarchiwizowane ({departments.filter((p) => p.status === "archived").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredDepartments.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Brak działów</h3>
              <p className="text-muted-foreground mt-2">
                {activeTab === "all"
                  ? "Utwórz pierwszy dział, aby rozpocząć organizację działalności"
                  : `Brak działów w statusie "${activeTab}"`}
              </p>
              {activeTab === "all" && (
                <Button onClick={handleCreateDepartment} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz dział
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDepartments.map((department) => (
                <DepartmentCard
                  key={department.id}
                  department={department}
                  stats={getDepartmentStats(department.id)}
                  onEdit={handleEditDepartment}
                  onFreeze={handleFreezeDepartment}
                  onUnfreeze={handleUnfreezeDepartment}
                  onClose={handleCloseDepartment}
                  onArchive={handleArchiveDepartment}
                  onReopen={handleReopenDepartment}
                  onDelete={handleDeleteDepartment}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDepartment}
        businessProfileId={selectedProfileId || ""}
        onSave={handleSaveDepartment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć dział?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Dział "{departmentToDelete?.name}" zostanie
              trwale usunięty. Wszystkie powiązane dokumenty stracą przypisanie do
              działu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDepartment}>
              Usuń dział
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentScreen;
export { DepartmentScreen };
