import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Project } from "@/shared/types";
import { getProjects } from "@/modules/projects/data/projectRepository";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";

interface ProjectContextValue {
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjectId: string | null;
  selectedProject: Project | null;
  selectProject: (id: string | null) => void;
  refreshProjects: () => Promise<void>;
  hasAnyProjects: boolean;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const getStorageKey = (businessProfileId: string) =>
  `selected_project_id:${businessProfileId}`;

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { selectedProfileId } = useBusinessProfile();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const storageKey = selectedProfileId
    ? getStorageKey(selectedProfileId)
    : undefined;

  const persistSelection = useCallback(
    (projectId: string | null) => {
      if (!storageKey) return;
      try {
        if (projectId) {
          localStorage.setItem(storageKey, projectId);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch {
        // ignore storage errors
      }
    },
    [storageKey]
  );

  const resolveInitialSelection = useCallback(
    (items: Project[]): string | null => {
      if (items.length === 0) {
        return null;
      }

      let candidate: string | null = null;

      if (storageKey) {
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored && items.some((project) => project.id === stored)) {
            candidate = stored;
          }
        } catch {
          candidate = null;
        }
      }

      if (!candidate) {
        const defaultProject = items.find((project) => project.is_default);
        candidate = defaultProject?.id ?? null;
      }

      return candidate;
    },
    [storageKey]
  );

  const loadProjects = useCallback(async () => {
    if (!selectedProfileId) {
      setProjects([]);
      setSelectedProjectId(null);
      return;
    }

    setIsLoadingProjects(true);
    try {
      const data = await getProjects(selectedProfileId);
      setProjects(data);

      setSelectedProjectId((prev) => {
        if (prev && data.some((project) => project.id === prev)) {
          return prev;
        }
        const next = resolveInitialSelection(data);
        persistSelection(next);
        return next;
      });
    } catch (error) {
      console.error("Error loading projects:", error);
      setProjects([]);
      setSelectedProjectId(null);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [persistSelection, resolveInitialSelection, selectedProfileId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectProject = useCallback(
    (projectId: string | null) => {
      setSelectedProjectId(projectId);
      persistSelection(projectId);
    },
    [persistSelection]
  );

  const value: ProjectContextValue = useMemo(() => {
    const selectedProject =
      projects.find((project) => project.id === selectedProjectId) ?? null;

    return {
      projects,
      isLoadingProjects,
      selectedProjectId,
      selectedProject,
      selectProject,
      refreshProjects: loadProjects,
      hasAnyProjects: projects.length > 0,
    };
  }, [
    isLoadingProjects,
    loadProjects,
    projects,
    selectProject,
    selectedProjectId,
  ]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectScope = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectScope must be used within a ProjectProvider");
  }
  return context;
};
