import React from 'react';
import { PDFViewer } from './PDFViewer';
import { XMLViewer } from './XMLViewer';
import { GenericFileViewer } from './GenericFileViewer';

interface FileViewerProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  className?: string;
  onClose?: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({
  fileUrl,
  fileName,
  mimeType,
  fileSize,
  className,
  onClose,
}) => {
  // Determine which viewer to use based on mime type
  if (mimeType === 'application/pdf') {
    return <PDFViewer fileUrl={fileUrl} fileName={fileName} className={className} onClose={onClose} />;
  }

  if (mimeType.includes('xml') || fileName.toLowerCase().endsWith('.xml')) {
    return <XMLViewer fileUrl={fileUrl} fileName={fileName} className={className} />;
  }

  return (
    <GenericFileViewer
      fileUrl={fileUrl}
      fileName={fileName}
      mimeType={mimeType}
      fileSize={fileSize}
      className={className}
    />
  );
};

export { PDFViewer, XMLViewer, GenericFileViewer };
