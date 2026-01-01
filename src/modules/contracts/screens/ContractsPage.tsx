import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { 
  FileText, Plus, Building2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useContractCategories, useContractMetadataFields } from '@/modules/contracts/hooks/useDepartmentContracts';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import { getContractsByBusinessProfile } from '@/modules/contracts/data/contractRepository';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import type { Contract } from '@/shared/types';

/**
 * Department-aware Contracts Page
 * 
 * Shows contract categories based on selected department template
 * Global mode: shows all contracts grouped by department
 * Department mode: shows template-specific categories and metadata fields
 */
const ContractsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId } = useBusinessProfile();
  const { selectedProject: selectedDepartment, projects: departments } = useProjectScope();
  
  const categories = useContractCategories(selectedDepartment?.template);
  const metadataFields = useContractMetadataFields(selectedDepartment?.template);

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return getContractsByBusinessProfile(selectedProfileId);
    },
    enabled: !!selectedProfileId,
  });

  const departmentContracts = useMemo(() => {
    if (!selectedDepartment) return contracts;
    return contracts.filter(c => c.projectId === selectedDepartment.id);
  }, [contracts, selectedDepartment]);

  if (!selectedDepartment) {
    // Global mode: show all departments with contract overview
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Umowy</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Pełen widok firmy - wszystkie umowy
            </p>
          </div>
          <Button onClick={() => navigate('/contracts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nowa umowa
          </Button>
        </div>

        {/* Department Overview */}
        {departments.length > 0 ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Działy</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(dept => {
                const template = getDepartmentTemplate(dept.template);
                const deptContracts = contracts.filter(c => c.projectId === dept.id);
                const categoryCount = template.contractCategories.length;
                
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
                          <span className="text-muted-foreground">Umowy:</span>
                          <span className="font-medium">{deptContracts.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Kategorie:</span>
                          <span className="font-medium">{categoryCount}</span>
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
                Utwórz dział, aby zorganizować umowy według szablonu
              </p>
              <Button onClick={() => navigate('/settings/projects')}>
                <Plus className="h-4 w-4 mr-2" />
                Utwórz dział
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Global contracts section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Umowy globalne</h2>
          <div className="grid grid-cols-1 gap-3">
            {contracts.filter(c => !c.projectId).length > 0 ? (
              contracts.filter(c => !c.projectId).map(contract => (
                <Card 
                  key={contract.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{contract.subject || contract.number}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(contract.issueDate).toLocaleDateString('pl-PL')}
                        </p>
                      </div>
                      <Badge variant={contract.isActive ? 'default' : 'secondary'}>
                        {contract.isActive ? 'Aktywna' : 'Nieaktywna'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Brak umów globalnych (niezwiązanych z działami)
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Department mode: show template-specific categories
  const template = getDepartmentTemplate(selectedDepartment.template);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Umowy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Widok działu: {selectedDepartment.name}
          </p>
        </div>
        <Button onClick={() => navigate('/contracts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nowa umowa
        </Button>
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
                Kategorie umów dla szablonu: {template.subtitle}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Categories */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Kategorie umów</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => {
            const categoryContracts = departmentContracts.filter(
              c => c.contract_type === category.id
            );
            
            return (
              <Card 
                key={category.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/contracts')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">{category.label}</h3>
                    </div>
                    <Badge variant="secondary">
                      {categoryContracts.length}
                    </Badge>
                  </div>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom Metadata Fields Info */}
      {metadataFields.length > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Pola niestandardowe dla tego działu
                </h3>
                <div className="space-y-1">
                  {metadataFields.slice(0, 5).map(field => (
                    <div key={field.id} className="text-sm text-blue-800 dark:text-blue-200">
                      • {field.label} {field.required && <span className="text-red-600">*</span>}
                    </div>
                  ))}
                  {metadataFields.length > 5 && (
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      ... i {metadataFields.length - 5} więcej
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Umowy ({departmentContracts.length})
        </h2>
        {departmentContracts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {departmentContracts.map(contract => (
              <Card 
                key={contract.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/contracts/${contract.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{contract.subject || contract.number}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.issueDate).toLocaleDateString('pl-PL')}
                      </p>
                    </div>
                    <Badge variant={contract.isActive ? 'default' : 'secondary'}>
                      {contract.isActive ? 'Aktywna' : 'Nieaktywna'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Brak umów</h3>
              <p className="text-muted-foreground mb-4">
                Utwórz pierwszą umowę dla tego działu
              </p>
              <Button onClick={() => navigate('/contracts/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Nowa umowa
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContractsPage;
