// Cached element references + the <template> cloner. Every dynamic widget (nav
// item, note card, agent bubble, annotate popover) is stamped from a <template>
// in index.astro, so the runtime DOM is real shadcn markup, never class strings
// hand-rolled in JS. Resolved at import: the client <script> runs after the
// body is parsed.

const byId = (id: string) => document.getElementById(id);

// Clone a widget prototype from its <template> (returns its root element).
export const tpl = (id: string): HTMLElement =>
  (byId(id) as HTMLTemplateElement).content.firstElementChild!.cloneNode(true) as HTMLElement;

export const navEl = byId("nav")!;
export const docEl = byId("doc")!;
export const mainEl = docEl.parentElement!; // scroll container on desktop
export const featureEl = byId("feature");
export const threadEl = byId("thread")!;
export const queueEl = byId("queue")!;
export const qcountEl = byId("qcount")!;
export const introEl = byId("intro")!;
export const composerEl = byId("composer") as HTMLFormElement;
export const composerInput = byId("composer-input") as HTMLTextAreaElement;
export const addNoteBtn = byId("add-note") as HTMLButtonElement;
export const sendBtn = byId("send") as HTMLButtonElement;
export const sendLabelEl = sendBtn.querySelector("[data-send-label]")!;
export const changeBarEl = byId("change-bar") as HTMLElement;
export const diffToggleEl = byId("diff-toggle") as HTMLButtonElement;
export const busyHintEl = byId("busy-hint") as HTMLElement;
export const busyHintTextEl = busyHintEl.querySelector("[data-text]")!;
export const statusEl = byId("status")!;
export const statusDotEl = statusEl.querySelector("[data-dot]")!;
export const statusTextEl = statusEl.querySelector("[data-text]")!;
export const messagesEl = byId("messages")!;
