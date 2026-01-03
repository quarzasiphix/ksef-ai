# Document Storage System

## Overview

The document storage system implements a **two-layer architecture** that separates business document objects from physical file storage:

### Layer A: Document Objects (Business Layer)
- **What**: Structured business records with metadata, lifecycle, and compliance rules
- **Purpose**: Legal-operational memory of execution
- **Features**: 
  - Section-based organization (Contracts, Financial, Operations, Audit, Decisions)
  - Smart folders with filters
  - Blueprint/template system
  - Entity linking (jobs, invoices, decisions, vehicles, etc.)
  - Compliance checks and versioning

### Layer B: Storage Directories (Physical Layer)
- **What**: Physical directory tree for file organization
- **Purpose**: File system structure independent of business logic
- **Features**:
  - True folder hierarchy with parent-child relationships
  - Section-agnostic (one file can be in multiple contexts)
  - Tag-based categorization (krs, e-doreczenia, signed, xml, pdf)
  - OCR and full-text search capabilities

## Architecture

```
Documents Module
├── Business Objects (Layer A)
│   ├── Sections (Contracts, Financial, Operations, Audit, Decisions)
│   ├── Smart Folders (filtered views)
│   ├── Document Types (templates/blueprints)
│   └── Entity Links (polymorphic relationships)
│
└── Storage Repository (Layer B)
    ├── Directory Tree (physical folders)
    ├── Files (with metadata)
    ├── File Viewers (PDF, XML, generic)
    └── Upload Management
```

## Key Components

### 1. Storage Types (`types/storage.ts`)
- `StorageFolder`: Physical directory structure
- `StorageFile`: File with metadata and versioning
- `FilePreview`: Preview information for different file types
- Helper functions for file categorization and formatting

### 2. File Viewers (`components/viewers/`)
- **PDFViewer**: Full-featured PDF viewer with zoom, pagination, download
- **XMLViewer**: Formatted/raw XML display with syntax highlighting
- **GenericFileViewer**: Handles images, text files, and unsupported formats
- **FileViewer**: Unified component that routes to appropriate viewer

### 3. Storage Components (`components/storage/`)
- **DirectoryTree**: Hierarchical folder navigation with expand/collapse
- **FileBrowser**: Grid/list view of files with search and sorting
- **FileUploadDialog**: Drag-and-drop file upload with metadata

### 4. Storage Repository Page (`screens/StorageRepositoryPage.tsx`)
- Three-panel layout: Directory Tree | File Browser | File Viewer
- Resizable panels for flexible workspace
- Context-aware actions (create folder, upload file, etc.)

## UI Navigation

### Sidebar Toggle
The DocumentsSidebar now includes a toggle between two modes:

1. **Sekcje (Sections)**: Business document organization
   - Shows document sections (Contracts, Financial, etc.)
   - Displays smart folders within each section
   - Focus on business logic and compliance

2. **Katalogi (Directories)**: Physical file repository
   - Shows directory tree structure
   - File-system-like navigation
   - Focus on file storage and retrieval

### Sidebar Label Update
- Changed from "Umowy" (Contracts) to "Dokumenty" (Documents)
- Updated icon from `Signature` to `FileText`
- Reflects broader scope of document management

## File Type Support

### Supported Formats
- **Documents**: PDF, DOC, DOCX, ODT
- **Spreadsheets**: XLS, XLSX, ODS, CSV
- **Images**: JPG, JPEG, PNG, GIF, BMP, SVG, WEBP
- **Data**: XML, JSON, YAML, YML
- **Archives**: ZIP, RAR, 7Z, TAR, GZ
- **Text**: TXT, MD, LOG

### Viewer Features
- **PDF**: Zoom, pagination, fullscreen, download
- **XML**: Formatted/raw view, syntax highlighting, copy to clipboard
- **Images**: Full-size preview with zoom
- **Text**: Syntax-highlighted code view
- **Unsupported**: Download option with file info

## Storage Tags

Common tags for file categorization:
- `krs`: Official registry documents
- `e-doreczenia`: Electronic delivery documents
- `signed`: Signed documents
- `unsigned`: Unsigned drafts
- `xml`: XML format files
- `pdf`: PDF format files
- `scan`: Scanned documents
- `original`: Original documents
- `copy`: Copies
- `archive`: Archived files

## Database Schema Extensions

### New Fields

**documents table:**
- `storage_folder_id`: Links document to physical directory (optional)

**document_attachments table:**
- `storage_folder_id`: Allows attachments in different directories (optional)

**storage_folders table:**
```sql
- id: string
- business_profile_id: string
- parent_folder_id: string (nullable)
- name: string
- description: string (nullable)
- path: string (computed)
- icon: string (nullable)
- color: string (nullable)
- tags: string[]
- created_at: timestamp
- updated_at: timestamp
- created_by: string
```

**storage_files table:**
```sql
- id: string
- storage_folder_id: string
- business_profile_id: string
- file_name: string
- file_path: string
- file_size: number
- mime_type: string
- file_extension: string
- document_id: string (nullable, links to document object)
- attachment_id: string (nullable, links to attachment)
- description: string (nullable)
- tags: string[]
- version: number
- is_latest: boolean
- parent_file_id: string (nullable, for versioning)
- uploaded_by: string
- uploaded_at: timestamp
- ocr_text: string (nullable)
- ocr_processed: boolean
```

## Usage Examples

### 1. Upload File to Repository
```typescript
import { FileUploadDialog } from '@/modules/documents/components/storage';

<FileUploadDialog
  open={uploadDialogOpen}
  onOpenChange={setUploadDialogOpen}
  folderId={currentFolderId}
  folderName={currentFolderName}
  onUpload={handleFileUpload}
/>
```

### 2. View File
```typescript
import { FileViewer } from '@/modules/documents/components/viewers';

<FileViewer
  fileUrl={file.file_path}
  fileName={file.file_name}
  mimeType={file.mime_type}
  fileSize={file.file_size}
/>
```

### 3. Browse Directory Tree
```typescript
import { DirectoryTree } from '@/modules/documents/components/storage';

<DirectoryTree
  folders={folderTree}
  files={[]}
  selectedFolderId={selectedFolderId}
  onFolderSelect={setSelectedFolderId}
  onFileSelect={setSelectedFileId}
  onCreateFolder={handleCreateFolder}
  onUploadFile={handleUploadFile}
/>
```

## Benefits of Two-Layer Architecture

### Separation of Concerns
- **Business logic** (documents) separate from **file storage** (directories)
- Documents can reference files without being tied to directory structure
- Files can exist independently or be linked to multiple documents

### Flexibility
- One file can be attached to multiple document objects
- Documents can have multiple files in different directories
- Easy to reorganize files without breaking document links

### User Experience
- **Business users**: Work with sections, smart folders, and compliance
- **Power users**: Navigate file system directly for quick access
- **Both**: Seamless switching between modes

### Auditability
- Full trail of document lifecycle (business layer)
- Complete file history with versioning (storage layer)
- Clear separation for regulatory compliance

## Future Enhancements

1. **OCR Integration**: Automatic text extraction from PDFs and images
2. **Advanced Search**: Full-text search across all files
3. **Bulk Operations**: Move, copy, delete multiple files
4. **Sharing**: Generate secure links for external sharing
5. **Version Comparison**: Side-by-side diff for document versions
6. **Automated Tagging**: AI-powered tag suggestions
7. **Storage Quotas**: Per-profile storage limits and monitoring
8. **Cloud Sync**: Integration with cloud storage providers

## Migration Path

For existing systems:
1. Keep existing document objects unchanged
2. Add `storage_folder_id` as optional field
3. Gradually migrate files to storage repository
4. Maintain backward compatibility with old structure
5. Provide migration tools for bulk file organization
