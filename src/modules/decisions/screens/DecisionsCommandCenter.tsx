import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useProjectScope } from '@/shared/context/ProjectContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  Shield, Users, FileText, Wallet, TrendingUp,
  Plus, ChevronRight, CheckCircle2, AlertCircle, XCircle, Building2, FolderKanban
} from 'lucide-react';
import { getDecisions } from '@/modules/spolka/data/decisionsRepository';
import type { Decision, BusinessDomain, DomainCoverage } from '@/modules/decisions/decisions';
import { DECISION_CATEGORY_LABELS, CATEGORY_TO_DOMAIN } from '@/modules/decisions/decisions';
import type { DecisionLevel } from '@/modules/decisions/types/decisionLevels';
import { getDecisionLevelMetadata } from '@/modules/decisions/types/decisionLevels';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';

const DecisionsCommandCenter = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { selectedProject: selectedDepartment, projects: departments } = useProjectScope();
  const [activeTab, setActiveTab] = useState<'global' | 'department' | 'project'>('global');

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  // Context-first: when department is selected, default to department tab
  useEffect(() => {
    if (selectedDepartment) {
      setActiveTab('department');
    } else {
      setActiveTab('global');
    }
  }, [selectedDepartment]);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return getDecisions(selectedProfileId);
    },
    enabled: !!selectedProfileId,
  });


  // Calculate domain coverage
  const domainCoverage = useMemo((): DomainCoverage[] => {
    const domains: BusinessDomain[] = ['capital', 'contracts', 'costs', 'revenue'];
    
    return domains.map(domain => {
      const domainDecisions = decisions.filter(d => 
        d.status === 'active' && CATEGORY_TO_DOMAIN[d.category] === domain
      );
      
      const totalUsage = domainDecisions.reduce((sum, d) => 
        sum + (d.total_contracts || 0) + (d.total_invoices || 0) + (d.total_expenses || 0), 0
      );

      let status: 'covered' | 'partial' | 'missing' = 'missing';
      if (domainDecisions.length > 0) {
        status = totalUsage > 0 ? 'covered' : 'partial';
      }

      const labels = {
        capital: 'Kapitał i własność',
        contracts: 'Umowy i relacje',
        costs: 'Koszty i operacje',
        revenue: 'Sprzedaż i przychody'
      };

      return {
        domain,
        label: labels[domain],
        icon: domain,
        hasDecisions: domainDecisions.length > 0,
        activeDecisions: domainDecisions.length,
        totalUsage,
        status
      };
    });
  }, [decisions]);

  // Group decisions by domain
  const decisionsByDomain = useMemo(() => {
    const grouped: Record<BusinessDomain, Decision[]> = {
      capital: [],
      contracts: [],
      costs: [],
      revenue: []
    };

    decisions
      .filter(d => d.status === 'active')
      .forEach(decision => {
        const domain = CATEGORY_TO_DOMAIN[decision.category];
        grouped[domain].push(decision);
      });

    return grouped;
  }, [decisions]);

  const getDomainIcon = (domain: BusinessDomain) => {
    const icons = {
      capital: Users,
      contracts: FileText,
      costs: Wallet,
      revenue: TrendingUp
    };
    return icons[domain];
  };

  const getStatusBadge = (status: 'covered' | 'partial' | 'missing') => {
    if (status === 'covered') {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pokryta
        </Badge>
      );
    }
    if (status === 'partial') {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Częściowa
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200">
        <XCircle className="h-3 w-3 mr-1" />
        Brak decyzji
      </Badge>
    );
  };

  // Filter decisions by level
  const globalDecisions = useMemo(() => 
    decisions.filter(d => !d.decision_level || d.decision_level === 'global'),
    [decisions]
  );

  const departmentDecisions = useMemo(() => 
    decisions.filter(d => 
      d.decision_level === 'department' && 
      (!selectedDepartment || d.department_id === selectedDepartment.id)
    ),
    [decisions, selectedDepartment]
  );

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  if (!isSpoolka) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Decyzje dostępne tylko dla Spółek</h2>
          <p className="text-muted-foreground mb-6">
            Ta sekcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
          <Button variant="outline" onClick={() => navigate('/accounting')}>
            Przejdź do księgowości
          </Button>
        </div>
      </div>
    );
  }

  const projectDecisions = useMemo(() => 
    decisions.filter(d => 
      d.decision_level === 'project' && 
      (!selectedDepartment || d.department_id === selectedDepartment.id)
    ),
    [decisions, selectedDepartment]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold">Decyzje i mandaty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedDepartment 
              ? `Widok działu: ${selectedDepartment.name}` 
              : 'Pełen widok firmy - podstawa prawna działań spółki'}
          </p>
        </div>
        <Button onClick={() => navigate('/decisions/new')} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nowa Decyzja
        </Button>
      </div>

      {/* Department Context Banner */}
      {selectedDepartment && (
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
                    {getDepartmentTemplate(selectedDepartment.template).name}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pokazuję decyzje tego działu oraz decyzje globalne wymagane jako podstawa prawna.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Level Tabs */}
      {selectedDepartment ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'global' | 'department' | 'project')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="department" className="gap-2">
              <Building2 className="h-4 w-4" />
              Decyzje działu
              <Badge variant="secondary" className="ml-1">{departmentDecisions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="global" className="gap-2">
              <Shield className="h-4 w-4" />
              Decyzje globalne
              <Badge variant="secondary" className="ml-1">{globalDecisions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="project" className="gap-2" disabled={projectDecisions.length === 0}>
              <FolderKanban className="h-4 w-4" />
              Decyzje wykonawcze
              <Badge variant="secondary" className="ml-1">{projectDecisions.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="department" className="space-y-4 mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Decyzje działu: {selectedDepartment.name}</h2>
              <p className="text-sm text-muted-foreground">
                Decyzje autoryzujące działalność tego działu. Każdy dział musi mieć decyzję podstawową.
              </p>
            </div>
            {departmentDecisions.length === 0 ? (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <h3 className="font-semibold text-red-900 dark:text-red-100">
                        Brak decyzji podstawowej działu
                      </h3>
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Ten dział nie może wystawiać umów, kosztów ani faktur bez mandatu. 
                        Decyzja działu jest wymagana jako podstawa prawna dla wszystkich operacji.
                      </p>
                      <Button
                        onClick={() => navigate('/decisions/new')}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Utwórz decyzję działu (zalecane)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              renderDecisionsList(departmentDecisions, 'department')
            )}
          </TabsContent>

          <TabsContent value="global" className="space-y-4 mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Decyzje spółki (obowiązują wszystkie działy)</h2>
              <p className="text-sm text-muted-foreground">
                Decyzje zarządu i wspólników. Podstawa prawna dla wszystkich działań biznesowych.
              </p>
            </div>
            {renderDecisionsList(globalDecisions, 'global')}
          </TabsContent>

          <TabsContent value="project" className="space-y-4 mt-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Decyzje wykonawcze (projekty / sprawy)</h2>
              <p className="text-sm text-muted-foreground">
                Decyzje dotyczące konkretnych projektów, spraw lub kampanii.
              </p>
            </div>
            {renderDecisionsList(projectDecisions, 'project')}
          </TabsContent>
        </Tabs>
      ) : (
        <>
        {/* Global Mode: Coverage Summary + Department Overview */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          Pokrycie decyzyjne
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {domainCoverage.map(coverage => {
            const Icon = getDomainIcon(coverage.domain);
            return (
              <Card key={coverage.domain} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        coverage.status === 'covered' ? 'bg-green-100 dark:bg-green-900/30' :
                        coverage.status === 'partial' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-red-100 dark:bg-red-900/30'
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          coverage.status === 'covered' ? 'text-green-600' :
                          coverage.status === 'partial' ? 'text-amber-600' :
                          'text-red-600'
                        }`} />
                      </div>
                    </div>
                    {getStatusBadge(coverage.status)}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{coverage.label}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{coverage.activeDecisions} decyzji</span>
                    {coverage.totalUsage > 0 && (
                      <>
                        <span>•</span>
                        <span>{coverage.totalUsage} użyć</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Department Overview Cards */}
      {departments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Działy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(dept => {
              const deptDecisions = decisions.filter(d => 
                d.decision_level === 'department' && d.department_id === dept.id
              );
              const hasCharterDecision = deptDecisions.length > 0;
              const template = getDepartmentTemplate(dept.template);
              
              return (
                <Card 
                  key={dept.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate('/decisions')}
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
                        <span className="text-muted-foreground">Decyzja działu:</span>
                        {hasCharterDecision ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Brak
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Decyzje wykonawcze:</span>
                        <span className="font-medium">
                          {decisions.filter(d => d.decision_level === 'project' && d.department_id === dept.id).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision Domains */}
      {(['capital', 'contracts', 'costs', 'revenue'] as BusinessDomain[]).map(domain => {
        const domainDecisions = decisionsByDomain[domain];
        const coverage = domainCoverage.find(c => c.domain === domain)!;
        const Icon = getDomainIcon(domain);

        if (domainDecisions.length === 0) {
          return (
            <Card key={domain} className="border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{coverage.label}</h3>
                      <p className="text-sm text-muted-foreground">Brak decyzji w tym obszarze</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/decisions/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj decyzję
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }

        return (
          <div key={domain}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{coverage.label}</h2>
              <Badge variant="secondary" className="text-xs">{domainDecisions.length}</Badge>
            </div>
            <div className="space-y-2">
              {domainDecisions.map(decision => {
                const totalUsage = (decision.total_contracts || 0) + 
                                  (decision.total_invoices || 0) + 
                                  (decision.total_expenses || 0);
                
                return (
                  <Card 
                    key={decision.id}
                    className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-primary/20"
                    onClick={() => navigate(`/decisions/${decision.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{decision.title}</h3>
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              Zatwierdzona
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {decision.scope_description || DECISION_CATEGORY_LABELS[decision.category]}
                          </p>
                          
                          {/* Usage indicators */}
                          {totalUsage > 0 && (
                            <div className="flex items-center gap-3 text-xs">
                              {decision.total_contracts! > 0 && (
                                <span className="text-muted-foreground">
                                  {decision.total_contracts} umów
                                </span>
                              )}
                              {decision.total_invoices! > 0 && (
                                <span className="text-muted-foreground">
                                  {decision.total_invoices} faktur
                                </span>
                              )}
                              {decision.total_expenses! > 0 && (
                                <span className="text-muted-foreground">
                                  {decision.total_expenses} wydatków
                                </span>
                              )}
                            </div>
                          )}
                          
                          {totalUsage === 0 && (
                            <div className="flex items-center gap-2 text-xs text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              <span>Nieużywana</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {decision.amount_limit && (
                            <div className="text-right">
                              <div className="text-sm font-semibold">
                                {(decision.total_amount_used || 0).toLocaleString('pl-PL')} PLN
                              </div>
                              <div className="text-xs text-muted-foreground">
                                z {decision.amount_limit.toLocaleString('pl-PL')} PLN
                              </div>
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Szczegóły
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

        {/* Empty State */}
        {decisions.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Brak decyzji</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Decyzje definiują, co spółka może robić. Dokumenty są dowodem tych decyzji.
              </p>
              <Button onClick={() => navigate('/decisions/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Utwórz pierwszą decyzję
              </Button>
            </CardContent>
          </Card>
        )}
        </>
      )}
    </div>
  );

  function renderDecisionsList(decisionsList: Decision[], level: DecisionLevel) {
    if (decisionsList.length === 0) {
      return (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Brak decyzji na poziomie {getDecisionLevelMetadata(level).label.toLowerCase()}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => navigate('/decisions/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj decyzję
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {decisionsList.map(decision => {
          const totalUsage = (decision.total_contracts || 0) + 
                            (decision.total_invoices || 0) + 
                            (decision.total_expenses || 0);
          
          return (
            <Card 
              key={decision.id}
              className="hover:shadow-md transition-all cursor-pointer group border-l-4 border-l-primary/20"
              onClick={() => navigate(`/decisions/${decision.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{decision.title}</h3>
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Zatwierdzona
                      </Badge>
                      {level === 'department' && (
                        <Badge variant="secondary" className="text-xs">
                          Podstawa działu
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {decision.scope_description || DECISION_CATEGORY_LABELS[decision.category]}
                    </p>
                    
                    {totalUsage > 0 && (
                      <div className="flex items-center gap-3 text-xs">
                        {decision.total_contracts! > 0 && (
                          <span className="text-muted-foreground">
                            {decision.total_contracts} umów
                          </span>
                        )}
                        {decision.total_invoices! > 0 && (
                          <span className="text-muted-foreground">
                            {decision.total_invoices} faktur
                          </span>
                        )}
                        {decision.total_expenses! > 0 && (
                          <span className="text-muted-foreground">
                            {decision.total_expenses} wydatków
                          </span>
                        )}
                      </div>
                    )}
                    
                    {totalUsage === 0 && level !== 'department' && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Nieużywana</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {decision.amount_limit && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {(decision.total_amount_used || 0).toLocaleString('pl-PL')} PLN
                        </div>
                        <div className="text-xs text-muted-foreground">
                          z {decision.amount_limit.toLocaleString('pl-PL')} PLN
                        </div>
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Szczegóły
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
};

export default DecisionsCommandCenter;
