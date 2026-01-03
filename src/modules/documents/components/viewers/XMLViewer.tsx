import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, Code2, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface XMLViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
}

export const XMLViewer: React.FC<XMLViewerProps> = ({ fileUrl, fileName, className }) => {
  const [xmlContent, setXmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchXML = async () => {
      try {
        setLoading(true);
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to load XML file');
        const text = await response.text();
        setXmlContent(text);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load XML');
      } finally {
        setLoading(false);
      }
    };

    fetchXML();
  }, [fileUrl]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(xmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatXML = (xml: string): string => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(xmlDoc);
      
      // Add indentation
      let indent = 0;
      return formatted
        .replace(/></g, '>\n<')
        .split('\n')
        .map(line => {
          if (line.match(/<\/\w/)) indent--;
          const indented = '  '.repeat(Math.max(0, indent)) + line;
          if (line.match(/<\w[^>]*[^\/]>$/)) indent++;
          return indented;
        })
        .join('\n');
    } catch {
      return xml;
    }
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8 bg-muted/30 rounded-lg border', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ładowanie pliku XML...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-8 bg-muted/30 rounded-lg border', className)}>
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  const displayContent = viewMode === 'formatted' ? formatXML(xmlContent) : xmlContent;

  return (
    <div className={cn('flex flex-col bg-muted/30 rounded-lg border', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
        </div>

        <div className="flex items-center gap-1">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 px-2 border-r">
            <Button
              variant={viewMode === 'formatted' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('formatted')}
            >
              Sformatowany
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('raw')}
            >
              Surowy
            </Button>
          </div>

          {/* Actions */}
          <Button variant="ghost" size="sm" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* XML Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs font-mono bg-background p-4 rounded border overflow-x-auto">
          <code className="text-foreground">{displayContent}</code>
        </pre>
      </div>
    </div>
  );
};
