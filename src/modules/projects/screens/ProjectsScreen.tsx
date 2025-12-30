import React, { useState, useEffect } from "react";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useAuth } from "@/shared/context/AuthContext";
import { Project, ProjectStats } from "@/shared/types";
import {
  getProjects,
  getProjectStats,
  createProject,
  updateProject,
  deleteProject,
  freezeProject,
  unfreezeProject,
  closeProject,
  archiveProject,
  reopenProject,
} from "../data/projectRepository";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectDialog } from "../components/ProjectDialog";
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

export const ProjectsScreen: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  useEffect(() => {
    if (selectedProfileId) {
      loadProjects();
    }
  }, [selectedProfileId]);

  const loadProjects = async () => {
    if (!selectedProfileId) return;

    try {
      setLoading(true);
      const [projectsData, statsData] = await Promise.all([
        getProjects(selectedProfileId),
        getProjectStats(selectedProfileId),
      ]);
      setProjects(projectsData);
      setProjectStats(statsData ?? []);
    } catch (error) {
      console.error("Error loading projects:", error);
      toast.error("Nie udało się załadować projektów");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setDialogOpen(true);
  };

  const handleSaveProject = async (data: any) => {
    if (!selectedProfileId || !user) return;

    try {
      if (selectedProject) {
        await updateProject(selectedProject.id, data);
        toast.success("Projekt zaktualizowany");
      } else {
        await createProject({
          ...data,
          business_profile_id: selectedProfileId,
          created_by: user.id,
          status: "active",
        });
        toast.success("Projekt utworzony");
      }
      setDialogOpen(false);
      loadProjects();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Nie udało się zapisać projektu");
    }
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject(projectToDelete.id);
      toast.success("Projekt usunięty");
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Nie udało się usunąć projektu");
    }
  };

  const handleFreezeProject = async (project: Project) => {
    if (!user) return;

    try {
      await freezeProject(project.id, user.id);
      toast.success("Projekt zamrożony");
      loadProjects();
    } catch (error) {
      console.error("Error freezing project:", error);
      toast.error("Nie udało się zamrozić projektu");
    }
  };

  const handleUnfreezeProject = async (project: Project) => {
    try {
      await unfreezeProject(project.id);
      toast.success("Projekt odblokowany");
      loadProjects();
    } catch (error) {
      console.error("Error unfreezing project:", error);
      toast.error("Nie udało się odblokować projektu");
    }
  };

  const handleCloseProject = async (project: Project) => {
    if (!user) return;

    try {
      await closeProject(project.id, user.id);
      toast.success("Projekt zamknięty");
      loadProjects();
    } catch (error) {
      console.error("Error closing project:", error);
      toast.error("Nie udało się zamknąć projektu");
    }
  };

  const handleArchiveProject = async (project: Project) => {
    try {
      await archiveProject(project.id);
      toast.success("Projekt zarchiwizowany");
      loadProjects();
    } catch (error) {
      console.error("Error archiving project:", error);
      toast.error("Nie udało się zarchiwizować projektu");
    }
  };

  const handleReopenProject = async (project: Project) => {
    try {
      await reopenProject(project.id);
      toast.success("Projekt otwarty ponownie");
      loadProjects();
    } catch (error) {
      console.error("Error reopening project:", error);
      toast.error("Nie udało się otworzyć projektu ponownie");
    }
  };

  const getProjectStats = (projectId: string): ProjectStats | undefined => {
    if (!projectStats || projectStats.length === 0) return undefined;
    return projectStats.find((s) => s.id === projectId);
  };

  const filteredProjects = projects.filter((project) => {
    if (activeTab === "all") return true;
    return project.status === activeTab;
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
          <h1 className="text-3xl font-bold">Projekty</h1>
          <p className="text-muted-foreground mt-1">
            Organizuj działalność biznesową w logiczne projekty
          </p>
        </div>
        <Button onClick={handleCreateProject}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy projekt
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Wszystkie ({projects.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Aktywne ({projects.filter((p) => p.status === "active").length})
          </TabsTrigger>
          <TabsTrigger value="frozen">
            Zamrożone ({projects.filter((p) => p.status === "frozen").length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Zamknięte ({projects.filter((p) => p.status === "closed").length})
          </TabsTrigger>
          <TabsTrigger value="archived">
            Zarchiwizowane ({projects.filter((p) => p.status === "archived").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Brak projektów</h3>
              <p className="text-muted-foreground mt-2">
                {activeTab === "all"
                  ? "Utwórz pierwszy projekt, aby rozpocząć organizację działalności"
                  : `Brak projektów w statusie "${activeTab}"`}
              </p>
              {activeTab === "all" && (
                <Button onClick={handleCreateProject} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz projekt
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  stats={getProjectStats(project.id)}
                  onEdit={handleEditProject}
                  onFreeze={handleFreezeProject}
                  onUnfreeze={handleUnfreezeProject}
                  onClose={handleCloseProject}
                  onArchive={handleArchiveProject}
                  onReopen={handleReopenProject}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={selectedProject}
        businessProfileId={selectedProfileId || ""}
        onSave={handleSaveProject}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Czy na pewno chcesz usunąć projekt?</AlertDialogTitle>
            <AlertDialogDescription>
              Ta akcja jest nieodwracalna. Projekt "{projectToDelete?.name}" zostanie
              trwale usunięty. Wszystkie powiązane dokumenty stracą przypisanie do
              projektu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>
              Usuń projekt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
