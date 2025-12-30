import React, { useEffect, useState } from "react";
import { Project } from "@/shared/types";
import { getActiveProjects } from "../data/projectRepository";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { FormControl } from "@/shared/ui/form";

interface ProjectSelectorProps {
  businessProfileId: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  allowEmpty?: boolean;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  businessProfileId,
  value,
  onChange,
  disabled = false,
  placeholder = "Wybierz projekt",
  allowEmpty = true,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const EMPTY_VALUE = "__none";

  useEffect(() => {
    if (businessProfileId) {
      loadProjects();
    }
  }, [businessProfileId]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getActiveProjects(businessProfileId);
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Ładowanie..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value ?? EMPTY_VALUE}
      onValueChange={(val) => onChange(val === EMPTY_VALUE ? undefined : val)}
      disabled={disabled}
    >
      <FormControl>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {allowEmpty && (
          <SelectItem value={EMPTY_VALUE}>
            <span className="text-muted-foreground">Brak projektu</span>
          </SelectItem>
        )}
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span>{project.name}</span>
              {project.code && (
                <span className="text-xs text-muted-foreground">
                  ({project.code})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
