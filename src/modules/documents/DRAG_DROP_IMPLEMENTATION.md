# Drag-and-Drop File Management

## Overview
Files can now be dragged from the file browser and dropped into folders in the sidebar to move them between folders.

## How It Works

### 1. File Drag Start
When you start dragging a file in the `FileBrowser`:
- `handleFileDragStart(fileId)` is called
- The `fileId` is passed up through the component tree to `DocumentsShell`
- `DocumentsShell` stores it in `draggedFileId` state

### 2. Folder Drop Target
When dragging over a folder in the sidebar (`DocumentsSidebar`):
- The folder highlights with a blue border (`border-primary/40 bg-primary/5`)
- The folder accepts the drop via `onDragOver` handler
- Drop effect is set to 'move'

### 3. File Drop
When you drop the file on a folder:
- `handleFileDropOnFolder(folderId)` is called in `DocumentsShell`
- `StorageService.moveFile(draggedFileId, targetFolderId)` is executed
- The file is moved in both storage bucket and database
- The dragged file state is cleared
- Success/error messages are shown

## Component Flow

```
FileBrowser (drag start)
    ↓
StorageRepositoryPage (passes handler up)
    ↓
DocumentRepository (passes to outlet context)
    ↓
DocumentsShell (manages draggedFileId state)
    ↓
DocumentsSidebar (drop target, triggers move)
```

## Key Files

- **FileBrowser.tsx**: Handles drag start/end events on files
- **StorageRepositoryPage.tsx**: Connects drag handlers to file browser
- **DocumentRepository.tsx**: Passes drag handlers from outlet context
- **DocumentsShell.tsx**: Manages drag state and executes file move
- **DocumentsSidebar.tsx**: Renders drop targets (folders) with visual feedback
- **StorageService.ts**: Contains `moveFile()` method for actual file relocation

## Visual Feedback

- **Dragging**: File shows draggable cursor
- **Hover over folder**: Folder highlights with blue border
- **Drop**: File moves to new folder, UI refreshes automatically

## Error Handling

- If move fails, an alert is shown: "Nie udało się przenieść pliku"
- Dragged file state is cleared even on error to prevent stuck state
- Errors are logged to console for debugging
