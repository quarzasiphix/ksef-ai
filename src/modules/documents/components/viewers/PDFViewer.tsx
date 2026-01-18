import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, Minimize2, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  className?: string;
  onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName, className, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Handle Escape key to close viewer
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className={cn(
      'flex flex-col bg-muted/30 rounded-lg border',
      isFullscreen && 'fixed inset-0 z-50 rounded-none',
      className
    )}>
      {/* Toolbar */}
      <div className="p-3 border-b bg-background">
        {/* Mobile-optimized toolbar */}
        <div className="space-y-3">
          {/* Top Row: Action Buttons (left) + Zoom Controls (right) */}
          <div className="flex items-center justify-between px-4 gap-4">
            {/* Action Buttons - Left side */}
            <div className="flex items-center gap-1">
              {onClose && (
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={onClose} 
                  className="h-12 w-12 p-0 sm:h-8 sm:w-8 sm:p-0"
                  title="Zamknij"
                >
                  <X className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              )}
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleDownload} 
                className="h-12 w-12 p-0 sm:h-8 sm:w-8 sm:p-0"
                title="Pobierz"
              >
                <Download className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={toggleFullscreen} 
                className="h-12 w-12 p-0 sm:h-8 sm:w-8 sm:p-0"
                title={isFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
              >
                {isFullscreen ? <Minimize2 className="h-5 w-5 sm:h-4 sm:w-4" /> : <Maximize2 className="h-5 w-5 sm:h-4 sm:w-4" />}
              </Button>
            </div>

            {/* Zoom Controls - Right side */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleZoomOut} 
                className="h-10 w-10 p-0 sm:h-8 sm:w-8 sm:p-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2 min-w-[50px] text-center">{zoom}%</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleZoomIn} 
                className="h-10 w-10 p-0 sm:h-8 sm:w-8 sm:p-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bottom Row: Filename (left) + Page Navigation (right) */}
          <div className="flex items-center justify-between px-4 gap-4">
            {/* Document Name - Left side */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{fileName}</span>
            </div>
            
            {/* Page Navigation - Right side */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-12 w-12 p-0 sm:h-8 sm:w-8 sm:p-0"
              >
                <ChevronLeft className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-sm font-medium px-3 min-w-[70px] text-center bg-muted rounded py-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="lg"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-12 w-12 p-0 sm:h-8 sm:w-8 sm:p-0"
              >
                <ChevronRight className="h-5 w-5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-muted/50 p-4">
        <div className="mx-auto" style={{ width: `${zoom}%`, maxWidth: '100%' }}>
          <iframe
            ref={iframeRef}
            src={`${fileUrl}#page=${currentPage}`}
            className="w-full h-[800px] bg-white rounded shadow-lg"
            title={fileName}
            onLoad={() => {
              // Note: Getting page count from iframe is complex and requires PDF.js
              // For now, we'll use a placeholder
              setTotalPages(1);
            }}
            onError={(e) => {
              console.error('PDF iframe error:', e);
              // Could show error message here
            }}
          />
        </div>
      </div>
    </div>
  );
};
