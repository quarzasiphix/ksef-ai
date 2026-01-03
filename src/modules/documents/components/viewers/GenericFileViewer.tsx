import React, { useState, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, File, Code } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { formatFileSize } from '../../types/storage';

interface GenericFileViewerProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  className?: string;
}

export const GenericFileViewer: React.FC<GenericFileViewerProps> = ({
  fileUrl,
  fileName,
  mimeType,
  fileSize,
  className,
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = mimeType.startsWith('image/');
  const isText = mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript');
  const canPreview = isImage || isText;

  useEffect(() => {
    if (isText && !isImage) {
      const fetchContent = async () => {
        try {
          setLoading(true);
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error('Failed to load file');
          const text = await response.text();
          setContent(text);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load file');
        } finally {
          setLoading(false);
        }
      };

      fetchContent();
    }
  }, [fileUrl, isText, isImage]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = () => {
    if (isImage) return <ImageIcon className="h-12 w-12 text-blue-500" />;
    if (isText) return <Code className="h-12 w-12 text-green-500" />;
    return <File className="h-12 w-12 text-muted-foreground" />;
  };

  if (!canPreview) {
    return (
      <div className={cn('flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg border', className)}>
        <div className="text-center max-w-md">
          {getFileIcon()}
          <h3 className="mt-4 text-lg font-medium">{fileName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Typ pliku: {mimeType}
          </p>
          {fileSize && (
            <p className="text-sm text-muted-foreground">
              Rozmiar: {formatFileSize(fileSize)}
            </p>
          )}
          <p className="mt-4 text-sm text-muted-foreground">
            Podgląd tego typu pliku nie jest dostępny. Pobierz plik, aby go otworzyć.
          </p>
          <Button onClick={handleDownload} className="mt-4">
            <Download className="h-4 w-4 mr-2" />
            Pobierz plik
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8 bg-muted/30 rounded-lg border', className)}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ładowanie pliku...</p>
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
          <Button onClick={handleDownload} variant="outline" className="mt-4">
            <Download className="h-4 w-4 mr-2" />
            Pobierz plik
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col bg-muted/30 rounded-lg border', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-background">
        <div className="flex items-center gap-2">
          {getFileIcon()}
          <div>
            <span className="text-sm font-medium block truncate max-w-[200px]">{fileName}</span>
            <span className="text-xs text-muted-foreground">{mimeType}</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isImage ? (
          <div className="flex items-center justify-center">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full h-auto rounded shadow-lg"
            />
          </div>
        ) : (
          <pre className="text-xs font-mono bg-background p-4 rounded border overflow-x-auto">
            <code className="text-foreground">{content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
