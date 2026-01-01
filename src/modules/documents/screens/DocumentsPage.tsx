import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  FileText, FolderOpen, Plus, Upload, 
  CheckCircle2, AlertCircle, Building2
} from 'lucide-react';
import { useDepartmentDocumentFolders } from '@/modules/documents/hooks/useDepartmentDocuments';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';

/**
 * Department-aware Documents Page
 * 
 * Shows document folders based on selected department template
 * Global mode: shows all folders grouped by department
 * Department mode: shows template-specific folder structure
 */
const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProject: selectedDepartment, projects: departments } = useProjectScope();
  
  const folders = useDepartmentDocumentFolders(selectedDepartment?.template);

  if (!selectedDepartment) {
    // Global mode: show all departments with folder overview
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Dokumenty</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pełen widok firmy - wszystkie dokumenty i foldery
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate('/contracts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nowa umowa
            </Button>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Prześlij dokument
            </Button>
          </div>
        </div>

        {/* Department Overview */}
        {departments.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Działy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const template = getDepartmentTemplate(dept.template);
                const folderCount = template.documentFolders.length;
                const requiredFolders = template.documentFolders.filter(f => f.required).length;
                
                return (
                  <Card 
                    key={dept.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate('/contracts')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: dept.color || '#3b82f6' }}
                          />
                          <h3 className="font-semibold">{dept.name}</h3>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {template.name}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Foldery:</span>
                          <span className="font-medium">{folderCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Wymagane:</span>
                          <span className="font-medium">{requiredFolders}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Brak działów</h3>
              <p className="text-muted-foreground mb-4">
                Utwórz dział, aby zorganizować dokumenty według szablonu
              </p>
              <Button onClick={() => navigate('/settings/projects')}>
                <Plus className="h-4 w-4 mr-2" />
                Utwórz dział
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Global folders section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Dokumenty firmowe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Dokumenty prawne</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Akty założycielskie, umowy spółki, KRS
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Uchwały</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Uchwały zarządu i wspólników
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Umowy ogólne</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Umowy niezwiązane z działami
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Department mode: show template-specific folders
  const template = getDepartmentTemplate(selectedDepartment.template);
  const requiredFolders = folders.filter(f => f.required);
  const optionalFolders = folders.filter(f => !f.required);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Dokumenty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Widok działu: {selectedDepartment.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nowa umowa
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Prześlij dokument
          </Button>
        </div>
      </div>

      {/* Department Context Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedDepartment.color || '#3b82f6' }}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{selectedDepartment.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {template.name}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Struktura folderów dla szablonu: {template.subtitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Required Folders */}
      {requiredFolders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Foldery wymagane</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requiredFolders.map(folder => (
              <Card 
                key={folder.id}
                className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-500"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold">{folder.label}</h3>
                    </div>
                    <Badge className="bg-red-50 text-red-700 border-red-200">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Wymagany
                    </Badge>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-muted-foreground">
                      {folder.description}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    0 dokumentów
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Optional Folders */}
      {optionalFolders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Foldery opcjonalne</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optionalFolders.map(folder => (
              <Card 
                key={folder.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{folder.label}</h3>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-muted-foreground">
                      {folder.description}
                    </p>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    0 dokumentów
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state if no folders */}
      {folders.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak folderów</h3>
            <p className="text-muted-foreground mb-4">
              Ten szablon działu nie definiuje struktury folderów
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentsPage;
