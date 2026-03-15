# Estate Filing Pack Print Actions Design

## Goal

Add per-artifact print actions to the estate filing-pack workspace so staff can generate, open, and print formal PDF and Word outputs directly from each filing-pack row in the desktop app.

## Current State

- The filing-pack UI shows artifact status, but it does not expose artifact-level actions.
- The filing-pack API generates the full pack and returns JSON metadata, but it does not support a single-artifact workflow.
- Generated artifacts are written to local storage through the document storage provider, but the UI is not given a local file path it can use for desktop print/open actions.
- The Electron bridge only exposes app metadata and does not currently support file-open or file-print commands.

## Chosen Approach

Implement row-level artifact actions in the filing-pack workspace and back them with a single-artifact generation path in the existing estate filing-pack API. For desktop users, add Electron IPC handlers that can open or print the generated local file. This keeps the user flow aligned with the current pack model while avoiding a second reporting surface.

## User Experience

- Each filing-pack artifact row will show its format and direct actions.
- Actions will be per artifact, not only per full pack.
- For ready artifacts:
  - `Generate` will create or refresh that artifact.
  - `Open` will open the generated local file in the default desktop application.
  - `Print` will invoke desktop printing for the generated file.
- PDF artifacts will print as generated PDFs.
- Word artifacts will print as generated `.docx` files.
- Errors from artifact generation or desktop printing will be shown inline in the workspace instead of failing silently.

## Backend Design

- Extend the existing filing-pack route to support `artifactCode` as an optional query parameter.
- When `artifactCode` is present:
  - generate only the requested artifact
  - save the generated file
  - return artifact metadata including:
    - `storageKey`
    - `contentType`
    - `sizeBytes`
    - `localFilePath`
- Keep the current whole-pack behavior unchanged when `artifactCode` is absent.
- Add storage-provider helpers to resolve a storage key to a local file path safely.

## Desktop Design

- Extend the preload bridge with:
  - `openFile(path)`
  - `printFile(path)`
- Add matching Electron main-process handlers.
- `openFile(path)` will use the OS default file opener.
- `printFile(path)` will use the Windows print verb so both PDF and Word files can be printed through the associated desktop application.
- If printing fails, return a clear error so the React UI can display it.

## Frontend Design

- Add a small client component for artifact actions inside the filing-pack status view.
- The client component will call the filing-pack API for a single artifact, then:
  - open the file with the desktop bridge when the user clicks `Open`
  - print the file with the desktop bridge when the user clicks `Print`
- The status card will continue to show whole-pack readiness, while the artifact rows will handle per-artifact actions.

## Testing

- Route test for single-artifact generation and returned local file path metadata.
- Component test for artifact action controls and format-specific labels.
- Desktop bridge test for the new preload-visible handlers.
- Main-process unit test coverage for open/print command behavior where practical.

## Non-Goals

- No bulk print-all action in this slice.
- No silent printing without user-visible OS handling.
- No redesign of the report content itself in this slice.
