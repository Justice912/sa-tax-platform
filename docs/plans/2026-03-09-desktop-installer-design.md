# Desktop Installer Design (TaxOps ZA)

## Goal
Add a production-ready Windows desktop distribution flow so TaxOps ZA can be installed and launched as a native desktop app without running a separate web server manually.

## Scope
- Keep existing Next.js + Prisma business modules unchanged.
- Use Electron as desktop shell (already added).
- Add packaged-runtime behavior in Electron main process:
  - If `APP_URL` is provided, load external URL (dev mode).
  - If `APP_URL` is not provided, start local bundled Next standalone server and load it.
- Add Windows installer build flow using Electron Builder (NSIS).

## Approach Options
1. External server only (not recommended): packaged app still depends on user running `next start`.
2. Bundle standalone server and spawn it internally (recommended): desktop app self-hosts local server.
3. Rewrite backend into pure Electron IPC services (high effort, out of scope for MVP phase).

## Recommended Architecture
- Use Option 2.
- Build Next with `output: "standalone"`.
- Package `.next/standalone` and `.next/static` as installer resources.
- Electron main process starts server child process when packaged/local mode is active.
- Child server lifecycle is tied to Electron app lifecycle.

## Security and Operations
- Keep Electron security defaults:
  - `contextIsolation: true`
  - `sandbox: true`
  - `nodeIntegration: false`
- Keep external links opening in system browser.
- Use user-writable storage path in desktop mode via `STORAGE_ROOT` pointing to app user data directory.

## Validation
- Unit test runtime path resolution logic.
- Run `npm run lint`, `npm run test`, and `npm run build`.
- Run installer build command and confirm artifact creation.

