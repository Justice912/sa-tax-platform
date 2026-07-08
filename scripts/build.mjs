// Production build wrapper.
//
// Applies pending Prisma migrations ONLY when a database is configured
// (DATABASE_URL present). This keeps three build contexts working without
// special-casing:
//   - Vercel Production (DATABASE_URL set)  -> migrate deploy, then build
//   - Vercel Preview / desktop / demo-only builds (no DATABASE_URL) -> skip
//     migrations, just build
// so a build never hard-fails merely because no database is wired up.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL detected — running `prisma migrate deploy`");
  run("prisma migrate deploy");
} else {
  console.log("[build] No DATABASE_URL — skipping migrations (demo / no-db build)");
}

console.log("[build] Running `next build`");
run("next build");
