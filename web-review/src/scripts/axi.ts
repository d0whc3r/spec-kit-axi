// axi review surface - browser entry. Wires the modules together and boots:
// theme + help, the annotate and composer interactions, the agent event stream,
// the persisted queue, then loads the feature manifest and first artifact.

import { featureEl, navEl, tpl } from "./dom.ts";
import { label } from "./state.ts";
import { loadDoc, docMessage } from "./doc.ts";
import { loadQueue } from "./queue.ts";
import { setupAnnotate } from "./annotate.ts";
import { setupComposer } from "./composer.ts";
import { connectEvents, renderStatus } from "./agent.ts";
import { setupTheme, setupHelp } from "./theme.ts";

async function init(): Promise<void> {
  setupTheme();
  setupHelp();
  setupAnnotate();
  setupComposer();
  renderStatus();
  connectEvents();
  await loadQueue();
  let manifest;
  try {
    manifest = await (await fetch("/api/manifest")).json();
  } catch {
    return docMessage("Could not reach the axi server.");
  }
  if (featureEl) featureEl.textContent = manifest.feature;
  if (!manifest.files.length) {
    return docMessage("No artifacts found in this feature.");
  }
  navEl.innerHTML = "";
  for (const name of manifest.files) {
    const b = tpl("tpl-nav-item");
    b.dataset.file = name;
    b.querySelector("[data-label]")!.textContent = label(name);
    b.addEventListener("click", () => loadDoc(name));
    navEl.appendChild(b);
  }
  loadDoc(manifest.files[0]);
}

init();
