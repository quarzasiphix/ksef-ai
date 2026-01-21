import React, { useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import { Button } from "@/shared/ui/button";
import { Check, FolderPlus, Loader2, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useProjectScope } from "@/shared/context/ProjectContext";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useNavigate } from "react-router-dom";

export const DepartmentSwitcher: React.FC = () => {
  const {
    projects,
    isLoadingProjects,
    selectedProjectId,
    selectProject,
    hasAnyProjects,
  } = useProjectScope();
  const { selectedProfileId } = useBusinessProfile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const handleSelect = (projectId: string | null) => {
    selectProject(projectId);
    setOpen(false);
  };

  const handleManageProjects = () => {
    navigate("/settings/projects");
    setOpen(false);
  };

  const handleAddProject = () => {
    navigate("/settings/projects?dialog=new");
    setOpen(false);
  };

  const displayLabel = activeProject
    ? activeProject.name
    : "Pełen widok firmy";

  const displayBadge = activeProject?.code ?? "ALL";
  const colorDot = activeProject?.color ?? "#0ea5e9";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10"
        >
          {isLoadingProjects ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorDot }}
            />
          )}
          <span className="text-sm font-medium">{displayLabel}</span>
          <span className="hidden md:inline-flex text-xs uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded-full">
            {displayBadge}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-0"
        align="end"
        sideOffset={8}
      >
        <Command>
          <CommandInput
            placeholder={
              hasAnyProjects ? "Szukaj działów..." : "Brak działów"
            }
          />
          <CommandList>
            <CommandEmpty>
              {isLoadingProjects
                ? "Ładowanie działów..."
                : "Brak działów"}
            </CommandEmpty>

            <CommandGroup heading="Aktywne działy">
              <CommandItem
                key="all-projects"
                onSelect={() => handleSelect(null)}
                className="flex items-center gap-2"
              >
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium">
                    Pełen widok firmy
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Pokaż wszystkie dokumenty niezależnie od działu
                  </span>
                </div>
                {!selectedProjectId && <Check className="h-4 w-4" />}
              </CommandItem>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(project.id)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {project.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {project.code || "Bez kodu"}
                    </span>
                  </div>
                  {selectedProjectId === project.id && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Akcje">
              <CommandItem
                onSelect={handleManageProjects}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span>Zarządzaj działami</span>
              </CommandItem>
              <CommandItem
                onSelect={handleAddProject}
                className="flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                <span>Dodaj dział</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
