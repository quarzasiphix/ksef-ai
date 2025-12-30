import React from "react";
import { Project, ProjectStats } from "@/shared/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { MoreVertical, FolderOpen, Lock, Archive, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatCurrency } from "@/shared/lib/invoice-utils";

interface ProjectCardProps {
  project: Project;
  stats?: ProjectStats;
  onEdit?: (project: Project) => void;
  onFreeze?: (project: Project) => void;
  onUnfreeze?: (project: Project) => void;
  onClose?: (project: Project) => void;
  onArchive?: (project: Project) => void;
  onReopen?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onClick?: (project: Project) => void;
}

const statusConfig = {
  active: {
    label: "Aktywny",
    icon: FolderOpen,
    color: "bg-green-500",
    badgeVariant: "default" as const,
  },
  frozen: {
    label: "Zamrożony",
    icon: Lock,
    color: "bg-blue-500",
    badgeVariant: "secondary" as const,
  },
  closed: {
    label: "Zamknięty",
    icon: CheckCircle,
    color: "bg-gray-500",
    badgeVariant: "outline" as const,
  },
  archived: {
    label: "Zarchiwizowany",
    icon: Archive,
    color: "bg-gray-400",
    badgeVariant: "outline" as const,
  },
};

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  stats,
  onEdit,
  onFreeze,
  onUnfreeze,
  onClose,
  onArchive,
  onReopen,
  onDelete,
  onClick,
}) => {
  const statusInfo = statusConfig[project.status];
  const StatusIcon = statusInfo.icon;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick?.(project)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-3 h-3 rounded-full ${statusInfo.color}`}
                style={{ backgroundColor: project.color }}
              />
              <CardTitle className="text-lg">{project.name}</CardTitle>
              {project.code && (
                <Badge variant="outline" className="text-xs">
                  {project.code}
                </Badge>
              )}
            </div>
            {project.description && (
              <CardDescription className="line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}>
                  Edytuj
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {project.status === "active" && onFreeze && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onFreeze(project);
                }}>
                  <Lock className="mr-2 h-4 w-4" />
                  Zamroź projekt
                </DropdownMenuItem>
              )}
              {project.status === "frozen" && onUnfreeze && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onUnfreeze(project);
                }}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Odblokuj projekt
                </DropdownMenuItem>
              )}
              {project.status === "active" && onClose && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onClose(project);
                }}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Zamknij projekt
                </DropdownMenuItem>
              )}
              {(project.status === "closed" || project.status === "archived") && onReopen && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onReopen(project);
                }}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Otwórz ponownie
                </DropdownMenuItem>
              )}
              {project.status === "closed" && onArchive && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onArchive(project);
                }}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archiwizuj
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project);
                    }}
                  >
                    Usuń projekt
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <StatusIcon className="h-4 w-4 text-muted-foreground" />
          <Badge variant={statusInfo.badgeVariant}>{statusInfo.label}</Badge>
          {project.is_default && (
            <Badge variant="outline" className="text-xs">
              Domyślny
            </Badge>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Faktury</p>
              <p className="font-medium">{stats.invoice_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Wydatki</p>
              <p className="font-medium">{stats.expense_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Przychody</p>
              <p className="font-medium text-green-600">
                {formatCurrency(stats.total_income, project.currency || "PLN")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Koszty</p>
              <p className="font-medium text-red-600">
                {formatCurrency(stats.total_expenses, project.currency || "PLN")}
              </p>
            </div>
          </div>
        )}

        {project.budget_limit && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Budżet</span>
              <span className="font-medium">
                {formatCurrency(project.budget_limit, project.currency || "PLN")}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
