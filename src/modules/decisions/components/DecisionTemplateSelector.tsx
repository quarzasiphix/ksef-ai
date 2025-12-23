import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Search, Star, Sparkles, TrendingUp, Users, Briefcase, Shield } from 'lucide-react';
import { getDecisionTemplates } from '@/modules/spolka/data/decisionTemplatesRepository';
import type { DecisionTemplate } from '@/modules/spolka/data/decisionTemplatesRepository';
import type { DecisionCategory } from '@/modules/decisions/decisions';
import { DECISION_CATEGORY_LABELS } from '@/modules/decisions/decisions';

interface DecisionTemplateSelectorProps {
  entityType?: string;
  onSelectTemplate: (template: DecisionTemplate) => void;
  onCreateCustom?: () => void;
  selectedTemplateIds?: string[];
  multiSelect?: boolean;
}

export const DecisionTemplateSelector: React.FC<DecisionTemplateSelectorProps> = ({
  entityType,
  onSelectTemplate,
  onCreateCustom,
  selectedTemplateIds = [],
  multiSelect = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'foundational' | 'popular'>('foundational');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['decision-templates', entityType, searchQuery],
    queryFn: () => getDecisionTemplates({
      entityType,
      searchQuery: searchQuery || undefined,
    }),
  });

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];

    switch (activeTab) {
      case 'foundational':
        return templates.filter(t => t.is_foundational);
      case 'popular':
        return templates.filter(t => t.usage_count > 0).sort((a, b) => b.usage_count - a.usage_count);
      case 'all':
      default:
        return templates;
    }
  }, [templates, activeTab]);

  const groupedByType = React.useMemo(() => {
    const strategic = filteredTemplates.filter(t => t.decision_type === 'strategic_shareholders');
    const operational = filteredTemplates.filter(t => t.decision_type === 'operational_board');
    const supervisory = filteredTemplates.filter(t => t.decision_type === 'supervisory_board');
    
    return { strategic, operational, supervisory };
  }, [filteredTemplates]);

  const isSelected = (templateId: string) => selectedTemplateIds.includes(templateId);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'strategic_shareholders':
        return <Users className="h-4 w-4 text-purple-600" />;
      case 'operational_board':
        return <Briefcase className="h-4 w-4 text-blue-600" />;
      case 'supervisory_board':
        return <Shield className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'strategic_shareholders':
        return 'Wspólnicy';
      case 'operational_board':
        return 'Zarząd';
      case 'supervisory_board':
        return 'Rada Nadzorcza';
      default:
        return type;
    }
  };

  const renderTemplateCard = (template: DecisionTemplate) => {
    const selected = isSelected(template.id);
    
    return (
      <Card
        key={template.id}
        className={`cursor-pointer transition-all hover:shadow-md ${
          selected ? 'border-primary border-2' : ''
        }`}
        onClick={() => onSelectTemplate(template)}
      >
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getTypeIcon(template.decision_type)}
                <h4 className="font-medium">{template.title}</h4>
                {template.is_foundational && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Podstawowa
                  </Badge>
                )}
              </div>
              
              {template.description && (
                <p className="text-sm text-muted-foreground mb-2">
                  {template.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(template.decision_type)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DECISION_CATEGORY_LABELS[template.category as DecisionCategory]}
                </Badge>
                {template.usage_count > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {template.usage_count} użyć
                  </Badge>
                )}
              </div>
            </div>
            
            {multiSelect && selected && (
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTemplateGroup = (title: string, templates: DecisionTemplate[], icon: React.ReactNode) => {
    if (templates.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-medium">{title}</h3>
          <Badge variant="secondary" className="text-xs">{templates.length}</Badge>
        </div>
        <div className="space-y-2">
          {templates.map(renderTemplateCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj szablonów decyzji..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="foundational">
            <Star className="h-4 w-4 mr-2" />
            Podstawowe
          </TabsTrigger>
          <TabsTrigger value="popular">
            <TrendingUp className="h-4 w-4 mr-2" />
            Popularne
          </TabsTrigger>
          <TabsTrigger value="all">
            <Sparkles className="h-4 w-4 mr-2" />
            Wszystkie
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Ładowanie szablonów...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nie znaleziono szablonów
                </p>
                {onCreateCustom && (
                  <Button onClick={onCreateCustom} variant="outline">
                    Utwórz niestandardową decyzję
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {renderTemplateGroup(
                  'Uchwały wspólników (strategiczne)',
                  groupedByType.strategic,
                  <Users className="h-5 w-5 text-purple-600" />
                )}
                
                {renderTemplateGroup(
                  'Uchwały zarządu (operacyjne)',
                  groupedByType.operational,
                  <Briefcase className="h-5 w-5 text-blue-600" />
                )}
                
                {renderTemplateGroup(
                  'Uchwały rady nadzorczej',
                  groupedByType.supervisory,
                  <Shield className="h-5 w-5 text-green-600" />
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Custom Decision Option */}
      {onCreateCustom && (
        <div className="pt-4 border-t">
          <Button onClick={onCreateCustom} variant="outline" className="w-full">
            <Sparkles className="h-4 w-4 mr-2" />
            Utwórz niestandardową decyzję
          </Button>
        </div>
      )}
    </div>
  );
};
