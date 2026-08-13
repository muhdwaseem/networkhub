import fs from "node:fs/promises";
import path from "node:path";

// Runs once when the server boots. If DATA_DIR points somewhere outside the
// repo (e.g. a Railway volume) and it doesn't have the data files yet, seed
// it from the repo's committed data/ so the site isn't empty on first
// deploy. Only ever writes a file that isn't already there, so it can never
// clobber real admin edits made after the first boot.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const dataDir = process.env.DATA_DIR;
  if (!dataDir) return;

  await fs.mkdir(dataDir, { recursive: true });
  const seedDir = path.join(process.cwd(), "data");

  for (const file of ["products.json", "categories.json", "brands.json", "settings.json"]) {
    const dest = path.join(/* turbopackIgnore: true */ dataDir, file);
    try {
      await fs.access(dest);
      continue; // already seeded
    } catch {
      // doesn't exist yet — seed it below
    }
    try {
      const seed = await fs.readFile(path.join(seedDir, file), "utf-8");
      await fs.writeFile(dest, seed, "utf-8");
    } catch {
      // no seed available for this file — lib/db.js falls back to defaults
    }
  }
}
