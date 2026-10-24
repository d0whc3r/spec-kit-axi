// Pipeline: update catalog.json on every successful release.
//
// Updates only the pipeline-owned fields: version, download_url, sha256 (of
// dist/axi-<version>.zip, so run build-zip.mjs first), requires (copied from
// extension.yml), updated_at, and created_at (only when empty).
// Identity fields are owned by sync-metadata.mjs and left untouched here.
//
// Usage: node update-catalog.mjs <version> <download_url>

import { createHash } from "node:crypto";
import { fs } from "zx";
import { PATHS, readJson, writeJson, readExtension } from "./lib/manifest.mjs";
import { format } from "./lib/format.mjs";
import { fromRoot, isMain } from "./lib/repo.mjs";
import { logger } from "./lib/log.mjs";

const log = logger("update-catalog");

// UTC ISO timestamp without milliseconds (matches the existing entries).
const nowIso = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

export async function updateCatalog({ version, downloadUrl }) {
  if (!version || !downloadUrl) {
    throw new Error("updateCatalog requires { version, downloadUrl }");
  }

  const requires = readExtension().requires;
  if (!requires?.speckit_version) {
    throw new Error("requires.speckit_version missing from extension.yml");
  }

  // Spec Kit verifies this digest before it installs from a catalog.
  const zip = fromRoot(`dist/axi-${version}.zip`);
  if (!fs.existsSync(zip)) throw new Error(`${zip} not found; run build-zip.mjs first`);
  const sha256 = createHash("sha256").update(fs.readFileSync(zip)).digest("hex");

  const catalog = readJson(PATHS.catalog);
  const now = nowIso();

  catalog.version = version;
  catalog.download_url = downloadUrl;
  catalog.sha256 = sha256;
  catalog.requires = requires;
  catalog.updated_at = now;
  if (!catalog.created_at) catalog.created_at = now;

  writeJson(PATHS.catalog, catalog);
  await format(PATHS.catalog);
  log.ok(`version=${version} download_url=${downloadUrl} sha256=${sha256}`);
}

if (isMain(import.meta.url)) {
  const [version, downloadUrl] = process.argv.slice(2);
  if (!version || !downloadUrl) {
    log.die("usage: update-catalog.mjs <version> <download_url>");
  }
  await updateCatalog({ version, downloadUrl });
}
