# Desktop Release Hardening Design

## Goal
Improve desktop release readiness for TaxOps ZA by supporting certificate-based signing and branded installer icon handling without breaking local unsigned builds.

## Design
- Add a release-build resolver module for deterministic build-mode selection.
- Keep unsigned builds as default to support restricted environments.
- Auto-switch to signed mode when `CSC_LINK` and `CSC_KEY_PASSWORD` are available.
- Add explicit controls:
  - `TAXOPS_FORCE_SIGNED=true` to enforce signing.
  - `TAXOPS_UNSIGNED=true` to force unsigned.
- Add optional icon discovery from `build/icon.ico` and pass it to Electron Builder only if present.

## Safety
- Signed-mode enforcement fails fast when required credentials are missing.
- Existing packaging behavior is preserved for users without signing assets.

