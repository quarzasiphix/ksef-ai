# Enhanced Document Management System for Spółki

## Overview

A comprehensive document management system designed specifically for Polish spółki (sp. z o.o., S.A.) that provides:

- **Virtual folder organization** - Organize documents in hierarchical folders
- **Document templates** - Pre-built templates for board resolutions, contracts, minutes
- **PDF generation** - Convert database documents to PDF format
- **Supabase Storage integration** - Store files in organized buckets
- **Contract management** - Enhanced umowy system with spółka-specific features
- **Bucket viewer** - Browse and manage uploaded files

## Database Schema

### Tables Created

#### 1. `document_folders`
Virtual folder structure for organizing documents.

**Columns:**
- `id` - UUID primary key
- `business_profile_id` - Reference to business profile
- `parent_folder_id` - Self-reference for nested folders
- `name` - Folder name
- `description` - Optional description
- `folder_type` - Type: contracts, resolutions, board_documents, correspondence, tax_documents, financial_reports, licenses, custom
- `icon` - Icon name (Lucide icons)
- `color` - Display color
- `sort_order` - Display order

**Default Folders for Spółki:**
1. Umowy (Contracts)
2. Uchwały (Resolutions)
3. Dokumenty Zarządu (Board Documents)
4. Korespondencja urzędowa (Official Correspondence)
5. Dokumenty podatkowe (Tax Documents)
6. Sprawozdania finansowe (Financial Reports)
7. Licencje i zezwolenia (Licenses)

#### 2. `document_templates`
Reusable document templates with variable substitution.

**Columns:**
- `id` - UUID primary key
- `business_profile_id` - Optional (null for public templates)
- `name` - Template name
- `template_type` - Type: board_resolution, shareholder_resolution, employment_contract, etc.
- `content` - HTML content with {{variable}} placeholders
- `variables` - JSONB array of variable definitions
- `css_styles` - Optional CSS for styling
- `is_public` - Available to all users
- `is_active` - Template enabled/disabled
- `category` - Grouping category
- `tags` - Array of tags

**Pre-installed Templates:**
1. **Uchwała Zarządu** - Board resolution template
2. **Protokół z posiedzenia Zarządu** - Board meeting minutes
3. **Umowa o pracę członka Zarządu** - Board member employment contract

#### 3. `generated_documents`
Documents created from templates with filled variables.

**Columns:**
- `id` - UUID primary key
- `business_profile_id` - Reference to business profile
- `template_id` - Source template
- `folder_id` - Organization folder
- `title` - Document title
- `document_type` - Type identifier
- `content_html` - Generated HTML content
- `variables_filled` - JSONB of filled variable values
- `pdf_file_path` - Path to generated PDF in storage
- `pdf_generated_at` - PDF generation timestamp
- `document_number` - Document reference number
- `document_date` - Document date
- `status` - draft, final, signed, archived
- `linked_contract_id` - Optional link to contract
- `linked_resolution_id` - Optional link to resolution

#### 4. Enhanced `company_documents`
Added columns for better organization:
- `folder_id` - Link to document folder
- `tags` - Array of tags
- `is_template` - Mark as template
- `template_type` - Template type if applicable
- `version` - Version number
- `parent_document_id` - Link to parent document

#### 5. Enhanced `contracts`
Added columns for spółka-specific features:
- `contract_type` - Type: general, employment, board_member, management_board, etc.
- `is_template` - Mark as template
- `folder_id` - Organization folder
- `signing_parties` - JSONB array of signatories
- `board_member_id` - Link to board member

## Repository Functions

### Folder Management
Located in `src/integrations/supabase/repositories/documentsRepository.ts`

```typescript
// Get all folders for a business profile
getDocumentFolders(businessProfileId: string): Promise<DocumentFolder[]>

// Get folder tree with hierarchy
getFolderTree(businessProfileId: string): Promise<FolderTreeNode[]>

// Create new folder
createFolder(input: CreateFolderInput): Promise<DocumentFolder>

// Update folder
updateFolder(id: string, updates: Partial<DocumentFolder>): Promise<void>

// Delete folder
deleteFolder(id: string): Promise<void>

// Get documents in folder
getDocumentsByFolder(folderId: string): Promise<CompanyDocument[]>

// Initialize default folders for spółki
initializeDefaultFolders(businessProfileId: string): Promise<void>
```

### Template Management

```typescript
// Get available templates
getDocumentTemplates(
  businessProfileId?: string,
  templateType?: string
): Promise<DocumentTemplate[]>

// Get single template
getDocumentTemplate(id: string): Promise<DocumentTemplate | null>

// Create custom template
createTemplate(input: CreateTemplateInput): Promise<DocumentTemplate>

// Update template
updateTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<void>

// Delete template
deleteTemplate(id: string): Promise<void>
```

### Document Generation

```typescript
// Generate document from template
generateDocument(input: GenerateDocumentInput): Promise<GeneratedDocument>

// Get generated documents
getGeneratedDocuments(
  businessProfileId: string,
  folderId?: string
): Promise<GeneratedDocument[]>

// Get single generated document
getGeneratedDocument(id: string): Promise<GeneratedDocument | null>

// Update generated document
updateGeneratedDocument(
  id: string,
  updates: Partial<GeneratedDocument>
): Promise<void>

// Delete generated document (also removes PDF from storage)
deleteGeneratedDocument(id: string): Promise<void>
```

## TypeScript Types

All types are defined in `src/types/documents.ts`:

```typescript
// Main types
DocumentFolder
DocumentTemplate
GeneratedDocument
EnhancedCompanyDocument
FolderTreeNode

// Input types
CreateFolderInput
CreateTemplateInput
GenerateDocumentInput

// Enums
FolderType
TemplateType
DocumentStatus
ContractType

// Label mappings
FOLDER_TYPE_LABELS
TEMPLATE_TYPE_LABELS
CONTRACT_TYPE_LABELS
FOLDER_ICONS
```

## Usage Examples

### 1. Initialize Default Folders for New Spółka

```typescript
import { initializeDefaultFolders } from '@/integrations/supabase/repositories/documentsRepository';

// When creating a new spółka profile
await initializeDefaultFolders(businessProfileId);
```

### 2. Create Document from Template

```typescript
import { generateDocument } from '@/integrations/supabase/repositories/documentsRepository';

const document = await generateDocument({
  business_profile_id: profileId,
  template_id: 'board-resolution-template-id',
  folder_id: 'resolutions-folder-id',
  title: 'Uchwała nr 1/2024',
  document_type: 'board_resolution',
  variables_filled: {
    company_name: 'Example Sp. z o.o.',
    resolution_date: '2024-12-16',
    resolution_number: '1/2024',
    subject: 'Zatwierdzenie budżetu',
    legal_basis: 'Art. 208 KSH',
    resolution_content: 'Zarząd zatwierdza...',
    board_signatures: 'Jan Kowalski - Prezes Zarządu'
  },
  document_number: 'UZ/1/2024',
  document_date: '2024-12-16'
});
```

### 3. Upload File to Folder

```typescript
import { uploadCompanyDocument } from '@/integrations/supabase/repositories/documentsRepository';

const doc = await uploadCompanyDocument(
  businessProfileId,
  'contracts_vehicles', // category
  file, // File object
  {
    title: 'Umowa leasingu samochodu',
    description: 'Leasing Toyota Corolla',
    document_date: '2024-12-01',
    expiry_date: '2027-12-01',
    reference_number: 'LEASE/2024/001'
  }
);

// Then optionally move to folder
await updateCompanyDocument(doc.id, {
  folder_id: 'contracts-folder-id'
});
```

### 4. Browse Folder Tree

```typescript
import { getFolderTree } from '@/integrations/supabase/repositories/documentsRepository';

const tree = await getFolderTree(businessProfileId);

// tree is hierarchical with children
tree.forEach(folder => {
  console.log(folder.name, folder.level, folder.path);
  folder.children.forEach(child => {
    console.log('  -', child.name);
  });
});
```

## Integration with Existing Systems

### Documents Page (`src/pages/spolka/Documents.tsx`)
- Already has category-based organization
- Can be enhanced to show folder tree in sidebar
- Add "Move to folder" action for documents
- Show folder breadcrumbs

### Umowy/Contracts
- Add contract type selector for spółka-specific contracts
- Link contracts to board members
- Support contract templates
- Organize contracts in folders

### PDF Generation
To be implemented using one of:
1. **jsPDF** - Client-side PDF generation
2. **react-pdf/renderer** - React components to PDF
3. **Puppeteer/Playwright** - Server-side rendering (Edge Function)

Recommended: **react-pdf/renderer** for best results

```typescript
// Example PDF generation
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View } from '@react-pdf/renderer';

const MyDocument = ({ content }) => (
  <Document>
    <Page>
      <View>
        <Text>{content}</Text>
      </View>
    </Page>
  </Document>
);

// Generate and upload
const blob = await pdf(<MyDocument content={htmlContent} />).toBlob();
const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
// Upload to Supabase Storage
```

## Next Steps

### Immediate (Core Functionality)
1. ✅ Database schema created
2. ✅ Repository functions implemented
3. ✅ TypeScript types defined
4. ✅ Default templates added
5. ⏳ Create DocumentManager component
6. ⏳ Enhance Documents page with folder tree
7. ⏳ Add PDF generation capability

### Short-term (Enhanced Features)
1. Create template editor UI
2. Add document preview modal
3. Implement drag-and-drop file upload
4. Add bulk operations (move, delete, tag)
5. Create document search/filter
6. Add version history for documents

### Long-term (Advanced Features)
1. Document approval workflows
2. Electronic signatures integration
3. Document expiry notifications
4. Automatic document numbering
5. OCR for scanned documents
6. Document sharing with external parties
7. Audit trail for document access

## Storage Bucket Structure

```
company-documents/
├── {business_profile_id}/
│   ├── contracts/
│   │   ├── vehicles/
│   │   ├── infrastructure/
│   │   ├── services/
│   │   └── other/
│   ├── resolutions/
│   ├── board_documents/
│   ├── correspondence/
│   ├── tax_documents/
│   ├── financial_reports/
│   ├── licenses/
│   └── generated/
│       └── pdfs/
```

## Security & RLS

All tables have Row Level Security enabled:
- Users can only access documents for their business profiles
- Public templates are visible to all authenticated users
- Private templates only visible to owner
- Generated documents follow business profile ownership

## Performance Considerations

1. **Indexes** - Created on frequently queried columns
2. **Folder tree** - Uses recursive CTE for efficient hierarchy queries
3. **File storage** - Organized in logical bucket structure
4. **Caching** - Consider caching folder trees and templates
5. **Pagination** - Implement for large document lists

## Maintenance

### Regular Tasks
- Clean up orphaned files in storage
- Archive old documents
- Update template content as needed
- Monitor storage usage
- Review and update RLS policies

### Monitoring
- Track document generation errors
- Monitor PDF generation performance
- Check storage bucket usage
- Review user access patterns
