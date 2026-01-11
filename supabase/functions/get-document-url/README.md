# Get Document URL Edge Function

This edge function provides secure, RLS-protected access to document files stored in Supabase Storage.

## Purpose

- Generates signed URLs for viewing/downloading documents
- Enforces Row Level Security (RLS) by verifying user access to business profiles
- Works with both accounting documents (`documents` table) and storage files (`storage_files` table)
- Prevents exposure of Supabase API keys in public URLs

## Deployment

Deploy this function to Supabase:

```bash
supabase functions deploy get-document-url
```

## Usage

### From Frontend

```typescript
import { DocumentUrlService } from '@/shared/services/documentUrlService';

// Get view URL for accounting document
const viewUrl = await DocumentUrlService.getViewUrl(documentId, 'accounting');

// Get view URL for storage file
const viewUrl = await DocumentUrlService.getViewUrl(fileId, 'storage');

// Get download URL
const downloadUrl = await DocumentUrlService.getDownloadUrl(documentId, 'accounting');
```

### API Parameters

- `documentId` - ID from `documents` table (for accounting documents)
- `fileId` - ID from `storage_files` table (for storage files)
- `action` - Either `view` (default) or `download`

### Response

```json
{
  "url": "https://...supabase.co/storage/v1/object/sign/documents/..."
}
```

## Security

1. Requires valid JWT token in Authorization header
2. Verifies user owns the business profile associated with the document
3. Generates time-limited signed URLs (1 hour for view, 1 minute for download)
4. All file access goes through RLS policies

## Error Responses

- `401` - Unauthorized (no valid session)
- `403` - Access denied (user doesn't own business profile)
- `404` - Document/file not found
- `500` - Server error
