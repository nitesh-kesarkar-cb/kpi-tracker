import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// The Prisma CLI loads `.env` by default, but this project's Postgres (Neon)
// URL lives in `.env.local` — `.env` holds a stale SQLite `file:` URL that
// fails against the `postgresql` datasource. Load `.env.local` first (with
// override) so `prisma db push` / `db seed` / `studio` target Neon without
// manually sourcing the env each time. The Next.js app already reads
// `.env.local`, so this only fixes the CLI.
loadEnv({ path: path.resolve(process.cwd(), ".env.local"), override: true });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts"
  }
});
